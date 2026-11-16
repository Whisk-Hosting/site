package main

import (
	"reflect"
	"strings"
	"testing"
)

func TestStaticFileFor(t *testing.T) {
	f, ok := StaticFileFor("/srv/c/", "/site.css")
	if !ok || f != (StaticFile{File: "/srv/c/site.css", Ext: ".css", Type: "text/css; charset=utf-8", Cache: "public, max-age=3600, stale-while-revalidate=86400"}) {
		t.Errorf("hashed: %+v", f)
	}
	if f, _ := StaticFileFor("/srv/c", "/fonts/A%20B.woff2"); f.File != "/srv/c/fonts/A B.woff2" {
		t.Errorf("decoded: %+v", f)
	}
	if f, _ := StaticFileFor("/srv/c", "/files/brochure.pdf"); f.Cache != "public, max-age=86400, stale-while-revalidate=604800" {
		t.Errorf("cache: %+v", f)
	}
	for _, p := range []string{"/about/", "/a/../../etc/passwd.css", "/.env.json", "/%2e%2e/x.css", "/x.php", "/%E0%A4%A.css"} {
		if _, ok := StaticFileFor("/srv/c", p); ok {
			t.Errorf("%s is served", p)
		}
	}
}

func TestFileVariantFor(t *testing.T) {
	has := func(files ...string) func(string) bool {
		return func(f string) bool { return some(files, func(x string) bool { return x == f }) }
	}
	png := StaticFile{File: "/a.png", Ext: ".png"}
	css := StaticFile{File: "/a.css", Ext: ".css"}
	cases := []struct {
		f              StaticFile
		accept, encode string
		has            func(string) bool
		want           FileVariant
	}{
		{png, "image/avif,image/webp,*/*", "", has("/a.png.webp"), FileVariant{File: "/a.png.webp", Type: "image/webp", Vary: "Accept"}},
		{png, "image/png", "", has("/a.png.webp"), FileVariant{File: "/a.png", Vary: "Accept"}},
		{StaticFile{File: "/a.jpg", Ext: ".jpg"}, "image/webp", "", has(), FileVariant{File: "/a.jpg"}},
		{css, "", "gzip, br", has("/a.css.br", "/a.css.gz"), FileVariant{File: "/a.css.br", Encoding: "br", Vary: "Accept-Encoding"}},
		{css, "", "br;q=0, gzip", has("/a.css.br", "/a.css.gz"), FileVariant{File: "/a.css.gz", Encoding: "gzip", Vary: "Accept-Encoding"}},
		{css, "", "", has("/a.css.br"), FileVariant{File: "/a.css", Vary: "Accept-Encoding"}},
	}
	for i, c := range cases {
		if got := FileVariantFor(c.f, c.accept, c.encode, c.has); got != c.want {
			t.Errorf("%d: %+v, want %+v", i, got, c.want)
		}
	}
	if Accepts("", "br") {
		t.Error("an empty header accepts nothing")
	}
}

func TestRedirects(t *testing.T) {
	list := ParseRedirects([]byte(`[{"from":"/old","to":"/new/"},{"from":"/old?p=2","to":"/new/2/"},{"from":"/gone","status":410},{"from":"/temp","to":"/t","status":302},{"from":"/broken"}]`))
	cases := []struct {
		path, query string
		want        Redirect
		ok          bool
	}{
		{"/old", "", Redirect{From: "/old", To: "/new/", Status: 301}, true},
		{"/old", "p=2", Redirect{From: "/old?p=2", To: "/new/2/", Status: 301}, true},
		{"/old", "p=3", Redirect{From: "/old", To: "/new/", Status: 301}, true},
		{"/gone", "", Redirect{From: "/gone", Status: 410}, true},
		{"/temp", "", Redirect{From: "/temp", To: "/t", Status: 302}, true},
		{"/broken", "", Redirect{}, false},
		{"/new/", "", Redirect{}, false},
	}
	for _, c := range cases {
		got, ok := RedirectFor(list, c.path, c.query)
		if got != c.want || ok != c.ok {
			t.Errorf("%s?%s: %+v %v", c.path, c.query, got, ok)
		}
	}
	if ParseRedirects([]byte(`{}`)) != nil || ParseRedirects(nil) != nil {
		t.Error("a file that is not a list is no redirects")
	}
	if got := ParseSitemaps([]byte(`["/sitemap_index.xml", 3]`)); !reflect.DeepEqual(got, []string{"/sitemap_index.xml"}) {
		t.Errorf("sitemaps: %v", got)
	}
	if !IsSitemap(nil, "/sitemap.xml") || IsSitemap(nil, "/page-sitemap.xml") || !IsSitemap([]string{"/sitemap_index.xml"}, "/sitemap_index.xml") {
		t.Error("IsSitemap")
	}
}

func TestForms(t *testing.T) {
	if FormName("/forms/contact") != "contact" || FormName("/forms/Contact") != "" || FormName("/forms/a/b") != "" {
		t.Error("FormName")
	}
	if f, ok := FormFields("application/x-www-form-urlencoded", []byte("name=Mia&email=a%40b.com")); !ok || !reflect.DeepEqual(f, map[string]any{"name": "Mia", "email": "a@b.com"}) {
		t.Errorf("form: %v", f)
	}
	if f, ok := FormFields("application/json", []byte(`{"a":1}`)); !ok || !reflect.DeepEqual(f, map[string]any{"a": 1.0}) {
		t.Errorf("json: %v", f)
	}
	for _, body := range []string{"[1]", "{", "null"} {
		if _, ok := FormFields("application/json", []byte(body)); ok {
			t.Errorf("%s is a form", body)
		}
	}
	if AnyFilled(map[string]any{"a": " ", "b": ""}) || !AnyFilled(map[string]any{"a": "x"}) {
		t.Error("AnyFilled")
	}
	cases := map[[2]string]string{
		{"https://example.com/contact/?x=1", "contact"}: "/contact/?sent=contact&x=1",
		{"", "contact"}:                  "/?sent=contact",
		{"https://evil.example//x", "c"}: "/?sent=c",
	}
	for in, want := range cases {
		if got := FormReturn(in[0], in[1]); got != want {
			t.Errorf("FormReturn(%q) = %q, want %q", in[0], got, want)
		}
	}
}

func TestSitemapAndRobots(t *testing.T) {
	got := SitemapXML("https://example.com", []SitemapEntry{{Path: "/a&b/", Updated: "2026-10-10T00:00:00Z"}})
	if !strings.Contains(got, "<loc>https://example.com/a&amp;b/</loc><lastmod>2026-10-10T00:00:00.000Z</lastmod>") {
		t.Error(got)
	}
	if RobotsTxt("https://example.com", "User-agent: *\nDisallow:\n") != "User-agent: *\nDisallow:\n" {
		t.Error("a moved site's own robots.txt")
	}
	if RobotsTxt("https://example.com", "") != "User-agent: *\nDisallow: /app\nDisallow: /cms\n\nSitemap: https://example.com/sitemap.xml\n" {
		t.Error("the default robots.txt")
	}
}

func TestLocalPath(t *testing.T) {
	cases := map[string]string{"/about/": "/about/", "/": "/", "//evil.example/x": "/", "/a\\b": "/", "https://evil.example": "/", "": "/", "about": "/"}
	for in, want := range cases {
		if got := LocalPath(in); got != want {
			t.Errorf("LocalPath(%q) = %q, want %q", in, got, want)
		}
	}
}
