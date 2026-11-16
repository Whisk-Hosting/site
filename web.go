// Pure helpers for what the server answers besides pages: files, old addresses, forms and the
// sitemap. Table-tested (web_test.go). The website and the shop share this file.
package main

import (
	"encoding/json"
	"fmt"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"
)

// The types of file the site serves from public/. Anything else is a page's address.
var fileTypes = map[string]string{
	".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
	".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
	".gif": "image/gif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
	".json": "application/json", ".webmanifest": "application/manifest+json",
	".txt": "text/plain; charset=utf-8", ".map": "application/json", ".xml": "application/xml",
	".pdf": "application/pdf", ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4",
	".webm": "video/webm", ".mp3": "audio/mpeg", ".html": "text/html; charset=utf-8",
}

// StaticFile is a file under public/ that a path names, its type and how long it may be cached.
type StaticFile struct {
	File  string
	Ext   string
	Type  string
	Cache string
}

// StaticFileFor is the file under root a path names; false for a path that is not a plain file
// name, escapes root, or has a type the site does not serve.
func StaticFileFor(root, urlPath string) (StaticFile, bool) {
	decoded, err := url.PathUnescape(urlPath)
	if err != nil || !strings.HasPrefix(decoded, "/") || strings.Contains(decoded, "\x00") ||
		some(strings.Split(decoded, "/"), func(p string) bool { return p == ".." || strings.HasPrefix(p, ".") }) {
		return StaticFile{}, false
	}
	ext := strings.ToLower(path.Ext(decoded))
	typ, ok := fileTypes[ext]
	if !ok {
		return StaticFile{}, false
	}
	return StaticFile{File: strings.TrimSuffix(root, "/") + decoded, Ext: ext, Type: typ, Cache: cacheFor(typ)}, true
}

// cacheFor is how long a file may be kept: pictures, fonts, documents and media for a day, then
// used while fetched again for a week, since they are rarely replaced under the same name;
// scripts, styles and the rest for an hour, since they change with the pages that use them.
func cacheFor(typ string) string {
	if some([]string{"image/", "font/", "video/", "audio/", "application/pdf"}, func(p string) bool { return strings.HasPrefix(typ, p) }) {
		return "public, max-age=86400, stale-while-revalidate=604800"
	}
	return "public, max-age=3600, stale-while-revalidate=86400"
}

// Accepts says whether a comma-separated Accept-style header names token with a q above zero.
func Accepts(header, token string) bool {
	return some(strings.Split(header, ","), func(part string) bool {
		bits := strings.Split(strings.ToLower(strings.TrimSpace(part)), ";")
		if strings.TrimSpace(bits[0]) != token {
			return false
		}
		q, ok := find(mapOf(bits[1:], strings.TrimSpace), func(p string) bool { return strings.HasPrefix(p, "q=") })
		if !ok {
			return true
		}
		n, err := strconv.ParseFloat(q[2:], 64)
		return err == nil && n > 0
	})
}

// FileVariant is the form of a file to send: a WebP for a photo, Brotli or gzip for text, written
// beside the file at build time, and what the answer varies by.
type FileVariant struct {
	File     string
	Type     string // when it differs from the file's own
	Encoding string
	Vary     string
}

// FileVariantFor is the smallest form of file this browser takes, of those has says exist.
func FileVariantFor(f StaticFile, accept, acceptEncoding string, has func(string) bool) FileVariant {
	if f.Ext == ".png" || f.Ext == ".jpg" || f.Ext == ".jpeg" {
		switch {
		case !has(f.File + ".webp"):
			return FileVariant{File: f.File}
		case Accepts(accept, "image/webp"):
			return FileVariant{File: f.File + ".webp", Type: "image/webp", Vary: "Accept"}
		default:
			return FileVariant{File: f.File, Vary: "Accept"}
		}
	}
	for _, enc := range [][2]string{{"br", ".br"}, {"gzip", ".gz"}} {
		if Accepts(acceptEncoding, enc[0]) && has(f.File+enc[1]) {
			return FileVariant{File: f.File + enc[1], Encoding: enc[0], Vary: "Accept-Encoding"}
		}
	}
	if has(f.File+".br") || has(f.File+".gz") {
		return FileVariant{File: f.File, Vary: "Accept-Encoding"}
	}
	return FileVariant{File: f.File}
}

// Redirect is one old address of a moved website (redirects.json, written by the mover).
type Redirect struct {
	From   string `json:"from"`
	To     string `json:"to"`
	Status int    `json:"status"`
}

// RedirectFor is where an old address goes, in one hop, or 410 for a page that is gone. One for
// the exact query wins over one for the path alone.
func RedirectFor(list []Redirect, p, query string) (Redirect, bool) {
	hit, ok := find(list, func(r Redirect) bool { return query != "" && r.From == p+"?"+query })
	if !ok {
		hit, ok = find(list, func(r Redirect) bool { return r.From == p })
	}
	switch {
	case !ok:
		return Redirect{}, false
	case hit.Status == 410:
		return Redirect{From: hit.From, Status: 410}, true
	case hit.To == "":
		return Redirect{}, false
	case hit.Status == 302 || hit.Status == 307 || hit.Status == 308:
		return hit, true
	}
	return Redirect{From: hit.From, To: hit.To, Status: 301}, true
}

// ParseRedirects reads redirects.json; nothing when it is missing or not a list.
func ParseRedirects(data []byte) []Redirect {
	var list []Redirect
	if json.Unmarshal(data, &list) != nil {
		return nil
	}
	return list
}

// ParseSitemaps reads sitemaps.json, a moved website's other sitemap addresses.
func ParseSitemaps(data []byte) []string {
	var list []any
	if json.Unmarshal(data, &list) != nil {
		return nil
	}
	return mapOf(filter(list, func(v any) bool { _, ok := v.(string); return ok }), func(v any) string { return v.(string) })
}

// IsSitemap says whether a path is the sitemap, at /sitemap.xml or one of a moved site's other
// addresses for it.
func IsSitemap(aliases []string, p string) bool {
	return p == "/sitemap.xml" || some(aliases, func(a string) bool { return a == p })
}

// FormFields reads a form post's fields from a form or a JSON object; false when it is neither.
func FormFields(contentType string, body []byte) (map[string]any, bool) {
	if strings.Contains(contentType, "application/json") {
		var out map[string]any
		if json.Unmarshal(body, &out) != nil || out == nil {
			return nil, false
		}
		return out, true
	}
	q, err := url.ParseQuery(string(body))
	if err != nil {
		return nil, false
	}
	out := make(map[string]any, len(q))
	for k, v := range q {
		out[k] = v[0]
	}
	return out, true
}

// AnyFilled says whether any field has something in it. The form script first posts empty to
// fetch the edge's challenge, which must not become an entry.
func AnyFilled(fields map[string]any) bool {
	for _, v := range fields {
		if v != nil && strings.TrimSpace(fmt.Sprint(v)) != "" {
			return true
		}
	}
	return false
}

// FormReturn is where a form post goes back to: the page it came from, told which form was sent.
func FormReturn(referer, name string) string {
	fallback := "/?sent=" + url.QueryEscape(name)
	u, err := url.Parse(referer)
	if referer == "" || err != nil || strings.HasPrefix(u.Path, "//") || u.Path == "" {
		return fallback
	}
	q := u.Query()
	q.Set("sent", name)
	return u.Path + "?" + q.Encode()
}

// ErrorBody is an error as the platform's errors are (contract/errors.md).
func ErrorBody(code, message, fix string) []byte {
	b, _ := json.Marshal(map[string]map[string]string{"error": {"code": code, "message": message, "fix": fix}})
	return b
}

// SitemapEntry is one address the sitemap lists.
type SitemapEntry struct {
	Path    string
	Updated string
}

// SitemapXML is the sitemap for origin.
func SitemapXML(origin string, entries []SitemapEntry) string {
	lines := mapOf(entries, func(e SitemapEntry) string {
		mod := ""
		if t, err := time.Parse(time.RFC3339Nano, e.Updated); err == nil {
			mod = "<lastmod>" + t.UTC().Format("2006-01-02T15:04:05.000Z") + "</lastmod>"
		}
		return "<url><loc>" + xmlEscape(origin+e.Path) + "</loc>" + mod + "</url>"
	})
	return strings.Join(append(append([]string{`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`}, lines...), "</urlset>", ""), "\n")
}

var xmlEscape = strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;").Replace

// LocalPath is a path on this site to send a browser to, or the home page when it would leave the
// site (//host or a backslash) or is not a path.
func LocalPath(p string) string {
	if !strings.HasPrefix(p, "/") || strings.HasPrefix(p, "//") || strings.ContainsAny(p, "\\\r\n") {
		return "/"
	}
	return p
}
