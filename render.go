// What the website's theme (theme/) reads to draw a page: theme/site.html is the frame and every
// page, each block is theme/blocks/<blockType>.html (draw.go), and theme/site.css is inlined.
package main

import (
	"html/template"
	"net/http"
	"net/url"
	"strings"
)

// View is everything a page's templates read. It is built once per request and never changed.
type View struct {
	Name        string // the site's name
	Title       string // the whole <title>
	Description string
	Canonical   string
	Image       string
	Noindex     bool
	Head        template.HTML // a page's own head markup, as the team wrote it
	Preview     bool
	Status      int
	Menus       Menus
	Page        ContentPage
	Sent        string // the form just sent, from ?sent=
	Year        int
	CSS         template.CSS
}

// PageView is what the theme reads to draw a page, or the not-found page when found is false.
func PageView(name, origin string, req Request, menus Menus, p ContentPage, found, preview bool, year int) View {
	site := pick(strings.TrimSpace(menus.Name) != "", strings.TrimSpace(menus.Name), name)
	v := View{Name: site, Menus: menus, Page: p, Preview: preview, Year: year, Status: http.StatusOK, Canonical: origin + req.Path, Sent: sentOf(req.Query)}
	if !found {
		v.Status, v.Title, v.Noindex = http.StatusNotFound, "Not found | "+site, true
		return v
	}
	v.Title = PageTitle(p, site)
	v.Description = p.Description
	v.Image = AsMedia(p.Image).URL
	v.Noindex = p.Noindex || preview
	// doctor: allow W097 head markup the business's team wrote in the editor, which only the team may change
	v.Head = template.HTML(p.Head) //nolint:gosec // head markup the team wrote in the editor
	return v
}

func sentOf(query string) string {
	q, _ := url.ParseQuery(query)
	return q.Get("sent")
}
