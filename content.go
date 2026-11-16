// Reading the site's content (pages, menus, product pages) from the content engine's API at
// /cms/api, in Payload's shape. Published content is kept a few seconds, so a busy page asks once,
// and kept a day for when the engine cannot answer, so pages heal rather than fail while it
// restarts. A preview (the team, ?preview=1) reads the draft every time.
package main

import (
	"context"
	"encoding/json"
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
	FindForEdit(ctx context.Context, a Asker, path string) string
	ProductPage(ctx context.Context, a Asker, handle string) (ProductPage, bool, error)
	Find(ctx context.Context, a Asker, collection string, q url.Values) ([]ContentPage, error)
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

// HTTPContent reads the content engine at Base (/cms/api beneath it).
type HTTPContent struct {
	Base   string
	Client *http.Client
	Now    func() time.Time
	kept   atomic.Pointer[Kept]
}

// NewHTTPContent reads the content engine at base.
func NewHTTPContent(base string) *HTTPContent {
	c := &HTTPContent{Base: strings.TrimSuffix(base, "/"), Client: &http.Client{Timeout: 5 * time.Second}, Now: time.Now}
	c.kept.Store(&Kept{})
	return c
}

func (c *HTTPContent) ask(ctx context.Context, a Asker, p string, q url.Values, into any) error {
	if a.Preview {
		q.Set("draft", "true")
	}
	u := c.Base + "/cms/api/" + p + "?" + q.Encode()
	now := c.Now()
	if body, ok := c.kept.Load().Within(u, now, fresh); ok && !a.Preview {
		return json.Unmarshal(body, into)
	}
	body, err := c.fetch(ctx, a, u)
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

func (c *HTTPContent) fetch(ctx context.Context, a Asker, u string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("accept", "application/json")
	if a.Preview {
		for _, h := range identityHeaders {
			if v := a.Identity[h]; v != "" {
				req.Header.Set(h, v)
			}
		}
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

// FindForEdit is the id of the page, published or draft, that a path shows, asked as the person
// here; "" when none has it or the engine cannot answer.
func (c *HTTPContent) FindForEdit(ctx context.Context, a Asker, p string) string {
	var got list[struct {
		ID json.Number `json:"id"`
	}]
	if c.ask(ctx, Asker{Preview: true, Identity: a.Identity}, "pages", PageQuery(p), &got) != nil || len(got.Docs) == 0 {
		return ""
	}
	return got.Docs[0].ID.String()
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

// Find is the documents of a collection a query names, asked as the person here with drafts (the
// Edit link's search).
func (c *HTTPContent) Find(ctx context.Context, a Asker, collection string, q url.Values) ([]ContentPage, error) {
	var got list[ContentPage]
	if err := c.ask(ctx, Asker{Preview: true, Identity: a.Identity, Market: a.Market}, collection, q, &got); err != nil {
		return nil, err
	}
	return got.Docs, nil
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

// PageQuery is the engine query that finds the page, draft or published, for an Edit link's path,
// in either form of the address and as written or decoded.
func PageQuery(p string) url.Values {
	forms := func(s string) []string {
		if s == "/" {
			return []string{s}
		}
		other, _ := OtherForm(s)
		return []string{s, other}
	}
	decoded, err := url.PathUnescape(p)
	if err != nil {
		decoded = p
	}
	q := url.Values{"depth": {"0"}, "limit": {"1"}, "draft": {"true"}}
	for i, f := range uniq(append(forms(p), forms(decoded)...)) {
		q.Set(fmt.Sprintf("where[or][%d][path][equals]", i), f)
	}
	return q
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
