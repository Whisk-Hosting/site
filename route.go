// What the website's server does with each request, decided by one pure function (Decide) from
// the request alone. The shell in main.go carries the decision out. Table-tested (route_test.go).
package main

import (
	"net/url"
	"regexp"
	"strings"
)

// Request is what a decision reads of an HTTP request: nothing that changes while it is decided.
type Request struct {
	Method  string
	Path    string
	Query   string // the raw query, without its "?"
	Headers map[string]string
}

// Kind names what the server does with a request.
type Kind int

const (
	Health  Kind = iota // the platform's health check
	Form                // a form post, kept in form_entries
	Go                  // a redirect to Location
	Editor              // the site editor and its API (/cms): Whisk's content engine
	Moved               // an old address of a moved website (redirects.json)
	Static              // a file from public/
	Sitemap             // sitemap.xml and its other addresses
	Robots              // robots.txt
	Page                // a page drawn from the content
)

// Action is a decision: its kind and what that kind needs.
type Action struct {
	Kind     Kind
	Location string // Go
	Form     string // Form
	Moved    Redirect
	File     StaticFile
}

// Site is what decisions know of the site: fixed for the life of the process.
type Site struct {
	Redirects []Redirect
	Sitemaps  []string
	Public    string // the folder of files served as they are
	Has       func(file string) bool
}

var (
	editorPath = regexp.MustCompile(`^/cms(/|$)`)
	adminPath  = regexp.MustCompile(`^/app(/|$)`)
	formPath   = regexp.MustCompile(`^/forms/([a-z0-9-]{1,40})$`)
)

// Decide is what the server does with a request, in order: health, a form post, the admin, the
// editor (which decides itself who may do what, the Edit link's /cms/edit too), an old address, a
// file, the sitemap, robots.txt, else a page.
func Decide(s Site, r Request) Action {
	read := r.Method == "GET" || r.Method == "HEAD"
	staff := IsStaff(r.Headers)
	switch {
	case r.Path == "/health/ready" || r.Path == "/health":
		return Action{Kind: Health}
	case FormName(r.Path) != "" && r.Method == "POST":
		return Action{Kind: Form, Form: FormName(r.Path)}
	case adminPath.MatchString(r.Path):
		return Action{Kind: Go, Location: pick(staff, "/cms", SignIn("/cms"))}
	case editorPath.MatchString(r.Path):
		return Action{Kind: Editor}
	}
	if !read {
		return Action{Kind: Page}
	}
	if m, ok := RedirectFor(s.Redirects, r.Path, r.Query); ok {
		return Action{Kind: Moved, Moved: m}
	}
	if f, ok := StaticFileFor(s.Public, r.Path); ok && s.Has(f.File) {
		return Action{Kind: Static, File: f}
	}
	switch {
	case IsSitemap(s.Sitemaps, r.Path):
		return Action{Kind: Sitemap}
	case r.Path == "/robots.txt":
		return Action{Kind: Robots}
	}
	return Action{Kind: Page}
}

// IsStaff says whether Whisk's edge says this is the business's team (CONTRACT.md §4): it sets
// these headers on every request and strips any a browser sends. Anyone but a guest may edit.
func IsStaff(h map[string]string) bool {
	return h["x-whisk-audience"] == "team" && h["x-whisk-user-id"] != "" && h["x-whisk-email"] != "" &&
		some(fields(h["x-whisk-roles"]), func(r string) bool { return r != "guest" })
}

// SignIn is Whisk's sign-in, then back to url.
func SignIn(u string) string { return "/.whisk/login?return=" + url.QueryEscape(u) }

// FormName is the form a path posts to (/forms/<name>), or "".
func FormName(path string) string {
	if m := formPath.FindStringSubmatch(path); m != nil {
		return m[1]
	}
	return ""
}

func fields(list string) []string {
	return filter(mapOf(strings.Split(list, ","), strings.TrimSpace), func(s string) bool { return s != "" })
}

// RobotsTxt is a moved website's own robots.txt as it was, or one that keeps crawlers out of the
// admin and names the sitemap.
func RobotsTxt(origin, own string) string {
	if strings.TrimSpace(own) != "" {
		return own
	}
	return "User-agent: *\nDisallow: /app\nDisallow: /cms\n\nSitemap: " + origin + "/sitemap.xml\n"
}
