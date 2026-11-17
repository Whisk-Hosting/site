package main

import (
	"testing"
)

var team = map[string]string{"x-whisk-user-id": "u1", "x-whisk-email": "jane@example.com", "x-whisk-audience": "team", "x-whisk-roles": "owner"}

func with(h map[string]string, k, v string) map[string]string {
	out := make(map[string]string, len(h)+1)
	for a, b := range h {
		out[a] = b
	}
	out[k] = v
	return out
}

func TestDecide(t *testing.T) {
	site := Site{
		Redirects: []Redirect{{From: "/old", To: "/new/"}, {From: "/gone", Status: 410}},
		Sitemaps:  []string{"/sitemap_index.xml"},
		Public:    "/srv/public",
		Has:       func(f string) bool { return f == "/srv/public/favicon.svg" },
		Editor:    true,
	}
	noEditor := site
	noEditor.Editor = false
	cases := []struct {
		name   string
		site   Site
		req    Request
		want   Kind
		detail string
	}{
		{"health", site, Request{Method: "GET", Path: "/health/ready"}, Health, ""},
		{"a form post", site, Request{Method: "POST", Path: "/forms/contact"}, Form, "contact"},
		{"a form read is a page", site, Request{Method: "GET", Path: "/forms/contact"}, Page, ""},
		{"the admin, for the team", site, Request{Method: "GET", Path: "/app", Headers: team}, Go, "/cms"},
		{"the admin, signed out", site, Request{Method: "GET", Path: "/app/pages"}, Go, "/.whisk/login?return=%2Fcms"},
		{"not the admin", site, Request{Method: "GET", Path: "/apple"}, Page, ""},
		{"the Edit link, signed out", site, Request{Method: "GET", Path: "/cms/edit", Query: "path=%2Fabout%2F"}, Go, "/.whisk/login?return=%2Fcms%2Fedit%3Fpath%3D%252Fabout%252F"},
		{"the Edit link", site, Request{Method: "GET", Path: "/cms/edit", Query: "path=%2Fabout%2F", Headers: team}, EditLink, "/about/"},
		{"an editor page, signed out", site, Request{Method: "GET", Path: "/cms/collections/pages"}, Go, "/.whisk/login?return=%2Fcms%2Fcollections%2Fpages"},
		{"an editor page", site, Request{Method: "GET", Path: "/cms/collections/pages", Headers: team}, Editor, ""},
		{"the editor's API, for anyone", site, Request{Method: "GET", Path: "/cms/api/pages"}, Editor, ""},
		{"the editor's files", site, Request{Method: "GET", Path: "/_next/static/a.js"}, Editor, ""},
		{"no editor here: the edge sends /cms elsewhere", noEditor, Request{Method: "GET", Path: "/cms/api/pages"}, Page, ""},
		{"an old address", site, Request{Method: "GET", Path: "/old"}, Moved, "/new/"},
		{"a page that is gone", site, Request{Method: "GET", Path: "/gone"}, Moved, ""},
		{"a file", site, Request{Method: "GET", Path: "/favicon.svg"}, Static, "/srv/public/favicon.svg"},
		{"a file that is not there is a page", site, Request{Method: "GET", Path: "/missing.svg"}, Page, ""},
		{"the sitemap", site, Request{Method: "GET", Path: "/sitemap.xml"}, Sitemap, ""},
		{"a moved site's sitemap", site, Request{Method: "GET", Path: "/sitemap_index.xml"}, Sitemap, ""},
		{"robots.txt", site, Request{Method: "GET", Path: "/robots.txt"}, Robots, ""},
		{"a page", site, Request{Method: "GET", Path: "/about/"}, Page, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			a := Decide(c.site, c.req)
			if a.Kind != c.want {
				t.Fatalf("kind = %d, want %d", a.Kind, c.want)
			}
			got := map[Kind]string{Go: a.Location, Form: a.Form, EditLink: a.EditPath, Moved: a.Moved.To, Static: a.File.File}[a.Kind]
			if got != c.detail {
				t.Fatalf("detail = %q, want %q", got, c.detail)
			}
		})
	}
}

func TestIsStaff(t *testing.T) {
	cases := []struct {
		h    map[string]string
		want bool
	}{
		{team, true},
		{with(team, "x-whisk-roles", "guest"), false},
		{with(team, "x-whisk-roles", "guest, member"), true},
		{with(team, "x-whisk-audience", "customer"), false},
		{with(team, "x-whisk-email", ""), false},
		{map[string]string{}, false},
	}
	for i, c := range cases {
		if got := IsStaff(c.h); got != c.want {
			t.Errorf("%d: IsStaff = %v, want %v", i, got, c.want)
		}
	}
}

func TestEditPath(t *testing.T) {
	cases := map[string]string{
		"path=%2Fabout%2F":        "/about/",
		"path=/services/repairs":  "/services/repairs",
		"":                        "/",
		"path=about":              "/",
		"path=%2F%2Fevil.example": "/",
		"path=%2Fa%23b":           "/",
	}
	for q, want := range cases {
		if got := EditPath(q); got != want {
			t.Errorf("EditPath(%q) = %q, want %q", q, got, want)
		}
	}
	if EditorFor("7") != "/cms/collections/pages/7" || EditorFor("") != "/cms/collections/pages" {
		t.Error("EditorFor")
	}
}

func TestRestartDelay(t *testing.T) {
	for failures, want := range map[int]int{1: 1, 2: 2, 3: 4, 7: 60, 8: 60, 20: 60} {
		if got := RestartDelay(failures).Seconds(); int(got) != want {
			t.Errorf("RestartDelay(%d) = %v, want %d", failures, got, want)
		}
	}
}

func TestConfig(t *testing.T) {
	env := func(m map[string]string) func(string) string { return func(k string) string { return m[k] } }
	c := configFrom(env(nil), []string{"--develop"})
	if c.Port != "8080" || c.Content != "http://127.0.0.1:9100" || c.CMSPort != "9100" || !c.Develop || c.Name != "Website" {
		t.Errorf("defaults: %+v", c)
	}
	c = configFrom(env(map[string]string{"CMS_URL": "http://content.internal"}), nil)
	if c.Content != "http://content.internal" || c.CMSPort != "" {
		t.Errorf("an engine elsewhere runs no editor here: %+v", c)
	}
	c = configFrom(env(map[string]string{"WHISK_CONTENT_URL": "http://content.internal.whisk:9320/", "CMS_URL": "http://other"}), nil)
	if c.Content != "http://content.internal.whisk:9320" || c.CMSPort != "" {
		t.Errorf("Whisk's content engine, which the node names, comes first: %+v", c)
	}
}
