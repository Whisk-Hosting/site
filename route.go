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
	Health   Kind = iota // the platform's health check
	Form                 // a form post, kept in form_entries
	Go                   // a redirect to Location
	EditLink             // the Whisk bar's Edit page: find the page at EditPath, then redirect
	Editor               // the editor and its API (Payload, while it runs beside the site)
	Moved                // an old address of a moved website (redirects.json)
	Static               // a file from public/
	Sitemap              // sitemap.xml and its other addresses
	Robots               // robots.txt
	Page                 // a page drawn from the content
)

// Action is a decision: its kind and what that kind needs.
type Action struct {
	Kind     Kind
	Location string // Go
	Form     string // Form
	EditPath string // EditLink
	Moved    Redirect
	File     StaticFile
}

// Site is what decisions know of the site: fixed for the life of the process.
type Site struct {
	Redirects []Redirect
	Sitemaps  []string
	Public    string // the folder of files served as they are
	Has       func(file string) bool
	Editor    bool // whether the editor (Payload) runs beside the site and answers /cms
}

var (
	editorPath = regexp.MustCompile(`^/(cms|_next)(/.*)?$`)
	adminPath  = regexp.MustCompile(`^/app(/|$)`)
	editorPage = regexp.MustCompile(`^/cms(/|$)`)
	editorAPI  = regexp.MustCompile(`^/cms/api(/|$)`)
	formPath   = regexp.MustCompile(`^/forms/([a-z0-9-]{1,40})$`)
)

// Decide is what the server does with a request, in order: health, a form post, the admin, the
// Edit page link, the editor, an old address, a file, the sitemap, robots.txt, else a page.
func Decide(s Site, r Request) Action {
	read := r.Method == "GET" || r.Method == "HEAD"
	staff := IsStaff(r.Headers)
	here := r.Path + withMark(r.Query)
	switch {
	case r.Path == "/health/ready" || r.Path == "/health":
		return Action{Kind: Health}
	case FormName(r.Path) != "" && r.Method == "POST":
		return Action{Kind: Form, Form: FormName(r.Path)}
	case adminPath.MatchString(r.Path):
		return Action{Kind: Go, Location: pick(staff, "/cms", SignIn("/cms"))}
	case r.Path == "/cms/edit" && !staff:
		return Action{Kind: Go, Location: SignIn(here)}
	case r.Path == "/cms/edit":
		return Action{Kind: EditLink, EditPath: EditPath(r.Query)}
	case s.Editor && editorPath.MatchString(r.Path) && IsEditorPage(r.Path) && !staff:
		return Action{Kind: Go, Location: SignIn(here)}
	case s.Editor && editorPath.MatchString(r.Path):
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

// IsEditorPage says whether a path is one of the editor's pages, which are for the team; its API
// answers anyone and decides itself what each may read or change.
func IsEditorPage(path string) bool {
	return editorPage.MatchString(path) && !editorAPI.MatchString(path)
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

// EditPath is the page path the Edit link asks for, or the home page when it is not one.
func EditPath(query string) string {
	q, _ := url.ParseQuery(query)
	p := q.Get("path")
	if !strings.HasPrefix(p, "/") || strings.HasPrefix(p, "//") || len(p) > 2000 || strings.ContainsAny(p, " \t\r\n#?\\") {
		return "/"
	}
	return p
}

// EditorFor is where the editor opens for the page found at an Edit link's path: the page, or
// the list of pages when none was found.
func EditorFor(id string) string {
	if id == "" {
		return "/cms/collections/pages"
	}
	return "/cms/collections/pages/" + url.PathEscape(id)
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
