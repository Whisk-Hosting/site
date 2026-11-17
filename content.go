// Reading the site's content (pages, menus, product pages) from the content engine's API at
// /cms/api, in Payload's shape. Published content is kept a few seconds, so a busy page asks once,
// and kept a day for when the engine cannot answer, so pages heal rather than fail while it
// restarts. A preview (the team, ?preview=1) reads the draft every time.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

// Block is one block of a page, as the editor gives it: its blockType and its fields. Blocks are
// open: a site adds its own, so they stay as the editor wrote them and a template reads them.
type Block = map[string]any

// Media is a picture or a video from the editor.
type Media struct {
	URL      string `json:"url"`
	Alt      string `json:"alt"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	MimeType string `json:"mimeType"`
}

// ContentPage is a page of the site at its address.
type ContentPage struct {
	ID          json.Number `json:"id"`
	Title       string      `json:"title"`
	SearchTitle string      `json:"searchTitle"`
	Path        string      `json:"path"`
	Description string      `json:"description"`
	Image       any         `json:"image"`
	Noindex     bool        `json:"noindex"`
	Head        string      `json:"head"`
	Layout      []Block     `json:"layout"`
	Market      string      `json:"market"`
	UpdatedAt   string      `json:"updatedAt"`
}

// Link is a label and an address in a menu.
type Link struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

// Menus are the site's name, header menu, footer columns and note.
type Menus struct {
	Name    string `json:"name"`
	Header  []Link `json:"header"`
	Columns []struct {
		Heading string `json:"heading"`
		Links   []Link `json:"links"`
	} `json:"columns"`
	Note string `json:"note"`
	// A shop's lists in search results (Shop in search): all products, and each category.
	ProductsTitle       string `json:"productsTitle"`
	ProductsDescription string `json:"productsDescription"`
	Categories          []struct {
		Handle      string `json:"handle"`
		SearchTitle string `json:"searchTitle"`
		Description string `json:"description"`
	} `json:"categories"`
}

// ProductPage is a shop product's own page in the editor: its story's blocks and its search
// details (the whole <title>, the description, and the product search engines should list in its
// place).
type ProductPage struct {
	Handle      string  `json:"handle"`
	Layout      []Block `json:"layout"`
	SearchTitle string  `json:"searchTitle"`
	Description string  `json:"description"`
	Canonical   string  `json:"canonical"`
}

// Asker is who reads content: the published site, or the team previewing drafts, with the
// headers that say who they are.
type Asker struct {
	Preview  bool
	Identity map[string]string
	Market   string
}

// Content is what pages read. HTTPContent reads the content engine over HTTP.
type Content interface {
	PageAt(ctx context.Context, a Asker, path string) (ContentPage, bool, error)
	Menus(ctx context.Context, a Asker) Menus
	Listed(ctx context.Context, a Asker) ([]ContentPage, error)
	ProductPage(ctx context.Context, a Asker, handle string) (ProductPage, bool, error)
}

// identityHeaders are the headers passed on for a preview, so the engine shows drafts to the team only.
var identityHeaders = []string{"x-whisk-user-id", "x-whisk-email", "x-whisk-name", "x-whisk-audience", "x-whisk-roles"}

const (
	fresh     = 15 * time.Second
	stale     = 24 * time.Hour
	keptLimit = 500
)

// kept is one answer and when it came.
type kept struct {
	body []byte
	at   time.Time
}

// Kept is the answers kept, as an immutable value: Keep returns a new one.
type Kept struct {
	answers map[string]kept
	order   []string // oldest first
}

// Keep is k with body kept for key at now, dropping the oldest past the limit.
func (k Kept) Keep(key string, body []byte, now time.Time) Kept {
	order := append(filter(k.order, func(s string) bool { return s != key }), key)
	if len(order) > keptLimit {
		order = order[len(order)-keptLimit:]
	}
	answers := make(map[string]kept, len(order))
	for _, o := range order {
		answers[o] = k.answers[o]
	}
	answers[key] = kept{body: body, at: now}
	return Kept{answers: answers, order: order}
}

// Within is the answer kept for key if it came less than age before now.
func (k Kept) Within(key string, now time.Time, age time.Duration) ([]byte, bool) {
	a, ok := k.answers[key]
	if !ok || now.Sub(a.at) >= age {
		return nil, false
	}
	return a.body, true
}

// HTTPContent reads the content engine at Base (/cms/api beneath it). Drafts are read as the
// person asking (DraftsVia): with the engine's Key beside the edge's identity when the server
// started the engine, or, with DraftsAtSite (Whisk's engine on the node, which counts every read
// from the app's network as a visitor's), through the site's own address with their cookie.
type HTTPContent struct {
	Base         string
	DraftsAtSite bool
	Key          string
	Client       *http.Client
	Now          func() time.Time
	kept         atomic.Pointer[Kept]
}

// DraftsVia is where a read goes and the headers it carries: published reads to base with none;
// drafts to base with the identity the edge set and the key of the engine the server started, or,
// when the engine trusts only the edge (atSite), to the site's own https address with the
// person's cookie alone. ok is false for a draft read at the site when the request names no host
// to ask. Pure.
func DraftsVia(base string, atSite bool, key string, a Asker) (to string, headers map[string]string, ok bool) {
	switch {
	case !a.Preview:
		return base, nil, true
	case !atSite:
		h := map[string]string{}
		for _, k := range identityHeaders {
			if v := a.Identity[k]; v != "" {
				h[k] = v
			}
		}
		if key != "" {
			h[strings.ToLower(contentKeyHeader)] = key
		}
		return base, h, true
	}
	host := a.Identity["host"]
	if host == "" || strings.ContainsAny(host, "/@?#\\ ") {
		return "", nil, false
	}
	return "https://" + host, pick(a.Identity["cookie"] != "", map[string]string{"cookie": a.Identity["cookie"]}, map[string]string{}), true
}

// NewHTTPContent reads the content engine at base: drafts through the site when atSite, else
// with the key of the engine the server started ("" for none).
func NewHTTPContent(base string, atSite bool, key string) *HTTPContent {
	c := &HTTPContent{Base: strings.TrimSuffix(base, "/"), DraftsAtSite: atSite, Key: key, Client: &http.Client{Timeout: 5 * time.Second}, Now: time.Now}
	c.kept.Store(&Kept{})
	return c
}

func (c *HTTPContent) ask(ctx context.Context, a Asker, p string, q url.Values, into any) error {
	if a.Preview {
		q.Set("draft", "true")
	}
	base, headers, ok := DraftsVia(c.Base, c.DraftsAtSite, c.Key, a)
	if !ok {
		return errors.New("a draft was asked for with no site address to ask it at")
	}
	u := base + "/cms/api/" + p + "?" + q.Encode()
	now := c.Now()
	if body, ok := c.kept.Load().Within(u, now, fresh); ok && !a.Preview {
		return json.Unmarshal(body, into)
	}
	body, err := c.fetch(ctx, headers, u)
	if err != nil {
		if old, ok := c.kept.Load().Within(u, now, stale); ok && !a.Preview {
			return json.Unmarshal(old, into)
		}
		return err
	}
	if !a.Preview {
		for {
			was := c.kept.Load()
			next := was.Keep(u, body, now)
			if c.kept.CompareAndSwap(was, &next) {
				break
			}
		}
	}
	return json.Unmarshal(body, into)
}

func (c *HTTPContent) fetch(ctx context.Context, headers map[string]string, u string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("accept", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	res, err := c.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("the content engine answered %d", res.StatusCode)
	}
	var raw json.RawMessage
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return nil, err
	}
	return raw, nil
}

type list[T any] struct {
	Docs        []T  `json:"docs"`
	HasNextPage bool `json:"hasNextPage"`
}

func (c *HTTPContent) pagesAt(ctx context.Context, a Asker, p string) (ContentPage, bool, error) {
	var got list[ContentPage]
	err := c.ask(ctx, a, "pages", url.Values{"where[path][equals]": {p}, "depth": {"2"}, "limit": {"10"}}, &got)
	if err != nil {
		return ContentPage{}, false, err
	}
	page, ok := ForSite(got.Docs, a.Market)
	return page, ok, nil
}

// PageAt is the page at an address, as written or as a moved site kept it, percent-encoded.
func (c *HTTPContent) PageAt(ctx context.Context, a Asker, p string) (ContentPage, bool, error) {
	page, ok, err := c.pagesAt(ctx, a, p)
	if ok || err != nil {
		return page, ok, err
	}
	if enc, differs := EncodedForm(p); differs {
		return c.pagesAt(ctx, a, enc)
	}
	return ContentPage{}, false, nil
}

// Menus are the site's menus, or none when the engine cannot say: a page still draws without them.
func (c *HTTPContent) Menus(ctx context.Context, a Asker) Menus {
	var m Menus
	if c.ask(ctx, a, "globals/menus", url.Values{"depth": {"0"}}, &m) != nil {
		return Menus{}
	}
	return m
}

// Listed is every published page search engines may list on this site, for the sitemap.
func (c *HTTPContent) Listed(ctx context.Context, a Asker) ([]ContentPage, error) {
	var all []ContentPage
	for n := 1; n <= 50; n++ {
		var got list[ContentPage]
		q := url.Values{"select[path]": {"true"}, "select[noindex]": {"true"}, "select[market]": {"true"}, "select[updatedAt]": {"true"},
			"depth": {"0"}, "limit": {"200"}, "page": {strconv.Itoa(n)}, "sort": {"path"}}
		if err := c.ask(ctx, a, "pages", q, &got); err != nil {
			return nil, err
		}
		all = append(all, got.Docs...)
		if !got.HasNextPage {
			break
		}
	}
	return ListedForSite(all, a.Market), nil
}

// ProductPage is a product's own page in the editor, when it has one.
func (c *HTTPContent) ProductPage(ctx context.Context, a Asker, handle string) (ProductPage, bool, error) {
	var got list[ProductPage]
	if err := c.ask(ctx, a, "product-pages", url.Values{"where[handle][equals]": {handle}, "depth": {"2"}, "limit": {"1"}}, &got); err != nil {
		return ProductPage{}, false, err
	}
	if len(got.Docs) == 0 {
		return ProductPage{}, false, nil
	}
	return got.Docs[0], true, nil
}

// ForSite is, of the pages at one address, the one a market's site shows: its own, else the one
// for every site; never another market's.
func ForSite(docs []ContentPage, market string) (ContentPage, bool) {
	if p, ok := find(docs, func(d ContentPage) bool { return market != "" && d.Market == market }); ok {
		return p, true
	}
	return find(docs, func(d ContentPage) bool { return d.Market == "" })
}

// ListedForSite is one page per address for a market's site, leaving out those search engines
// should not list.
func ListedForSite(docs []ContentPage, market string) []ContentPage {
	paths := uniq(mapOf(docs, func(d ContentPage) string { return d.Path }))
	out := []ContentPage{}
	for _, p := range paths {
		if d, ok := ForSite(filter(docs, func(d ContentPage) bool { return d.Path == p }), market); ok && !d.Noindex {
			out = append(out, d)
		}
	}
	return out
}

// OtherForm is an address with or without its last slash: a page is found at either, and the
// visitor sent to the one it was given.
func OtherForm(p string) (string, bool) {
	switch {
	case p == "/":
		return "", false
	case strings.HasSuffix(p, "/"):
		return strings.TrimSuffix(p, "/"), true
	}
	return p + "/", true
}

// EncodedForm is an address with letters beyond ASCII as a moved site kept it, percent-encoded;
// false when it reads the same either way.
func EncodedForm(p string) (string, bool) {
	enc := (&url.URL{Path: p}).EscapedPath()
	return enc, enc != p
}

// PageTitle is a page's whole <title>: the one given for search results, or its title and the
// site's name, or the site's name alone on the home page.
func PageTitle(p ContentPage, site string) string {
	switch {
	case strings.TrimSpace(p.SearchTitle) != "":
		return strings.TrimSpace(p.SearchTitle)
	case p.Path == "/" || p.Title == "":
		return site
	}
	return p.Title + " | " + site
}
