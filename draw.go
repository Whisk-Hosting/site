// Drawing pages from a theme: Go templates the site's agent edits. The theme's folder holds the
// frame and pages (*.html), one file per block (blocks/<blockType>.html), shared pieces
// (parts/*.html) and the style sheet, inlined in every page. A template is named by its file's
// path without .html: "site", "blocks/hero", "parts/card". A block the theme has no file for
// draws nothing. The website and the shop share this file.
package main

import (
	"bytes"
	"fmt"
	"html/template"
	"io/fs"
	"path"
	"regexp"
	"strings"
)

// Theme is the parsed templates and the style sheet: built once at start, never changed after.
type Theme struct {
	tmpl *template.Template
	css  template.CSS
}

// LoadTheme parses the theme in fsys, with the helpers in extra beside the shared ones, and the
// style sheet named css.
func LoadTheme(fsys fs.FS, css string, extra template.FuncMap) (Theme, error) {
	var t *template.Template
	draw := func(name string, data any) (template.HTML, error) {
		if t.Lookup(name) == nil {
			return "", nil
		}
		var b bytes.Buffer
		if err := t.ExecuteTemplate(&b, name, data); err != nil {
			return "", err
		}
		// doctor: allow W097 html/template's own escaped output
		return template.HTML(b.String()), nil //nolint:gosec // the template's own escaped output
	}
	t = template.New("theme").Funcs(Funcs(draw)).Funcs(extra).Option("missingkey=zero")
	var files []string
	for _, pattern := range []string{"*.html", "blocks/*.html", "parts/*.html", "pages/*.html"} {
		found, err := fs.Glob(fsys, pattern)
		if err != nil {
			return Theme{}, err
		}
		files = append(files, found...)
	}
	for _, f := range files {
		src, err := fs.ReadFile(fsys, f)
		if err != nil {
			return Theme{}, err
		}
		if _, err := t.New(strings.TrimSuffix(f, ".html")).Parse(string(src)); err != nil {
			return Theme{}, fmt.Errorf("%s: %w", f, err)
		}
	}
	sheet, _ := fs.ReadFile(fsys, css)
	return Theme{tmpl: t, css: template.CSS(sheet)}, nil //nolint:gosec // the theme's own style sheet
}

// CSS is the theme's style sheet, for the frame to inline.
func (th Theme) CSS() template.CSS { return th.css }

// Render draws the named template with data.
func (th Theme) Render(name string, data any) ([]byte, error) {
	var b bytes.Buffer
	if err := th.tmpl.ExecuteTemplate(&b, name, data); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

// BlockData is what a block's template reads: the block's fields, whether it is the page's first
// and the page's view.
type BlockData struct {
	B     Block
	First bool
	View  any
}

// Funcs are the helpers every theme's templates call. draw runs a named template.
func Funcs(draw func(name string, data any) (template.HTML, error)) template.FuncMap {
	return template.FuncMap{
		// draw draws one block with blocks/<blockType>.html.
		"draw": func(b Block, i int, v any) (template.HTML, error) {
			kind, _ := b["blockType"].(string)
			if !blockName.MatchString(kind) {
				return "", nil
			}
			return draw(path.Join("blocks", kind), BlockData{B: b, First: i == 0, View: v})
		},
		// part draws parts/<name>.html with data.
		"part": func(name string, data any) (template.HTML, error) {
			if !blockName.MatchString(name) {
				return "", fmt.Errorf("no part %q", name)
			}
			return draw(path.Join("parts", name), data)
		},
		// page draws pages/<name>.html with data: the frame draws the page it was given.
		"page": func(name string, data any) (template.HTML, error) {
			if !blockName.MatchString(name) {
				return "", fmt.Errorf("no page %q", name)
			}
			return draw(path.Join("pages", name), data)
		},
		// dict makes a value of pairs, to hand a part more than one thing.
		"dict": func(kv ...any) (map[string]any, error) {
			if len(kv)%2 != 0 {
				return nil, fmt.Errorf("dict takes pairs")
			}
			out := make(map[string]any, len(kv)/2)
			for i := 0; i < len(kv); i += 2 {
				out[str(kv[i])] = kv[i+1]
			}
			return out, nil
		},
		"media":     AsMedia,
		"picture":   Picture,
		"img":       func(v any, width int, eager bool, class string) template.HTML { return Img(v, width, eager, class, "") },
		"imgSized":  Img,
		"hasPrefix": strings.HasPrefix,
		"pick": func(cond any, yes, no any) any {
			if truthy(cond) {
				return yes
			}
			return no
		},
		// doctor: allow W097 markup the business's team wrote in the editor, which only the team may change
		"html":  func(s any) template.HTML { return template.HTML(str(s)) }, //nolint:gosec // markup the team wrote in the editor
		"lines": Lines,
		"tel":   Tel,
		"str":   str,
		"list":  asList,
	}
}

var blockName = regexp.MustCompile(`^[A-Za-z0-9_-]{1,60}$`)

func str(v any) string {
	switch s := v.(type) {
	case nil:
		return ""
	case string:
		return s
	}
	return fmt.Sprint(v)
}

func asList(v any) []any {
	l, _ := v.([]any)
	return l
}

func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return x != ""
	case float64:
		return x != 0
	case int:
		return x != 0
	}
	return true
}

// AsMedia is a picture or video field as Media; empty when it is only an id (not read with the
// page) or missing.
func AsMedia(v any) Media {
	m, ok := v.(map[string]any)
	if !ok {
		return Media{}
	}
	num := func(k string) int {
		f, _ := m[k].(float64)
		return int(f)
	}
	return Media{URL: str(m["url"]), Alt: str(m["alt"]), Width: num("width"), Height: num("height"), MimeType: str(m["mimeType"])}
}

// Pic is a picture's address at the width the layout shows it, and the widths a browser may
// choose from.
type Pic struct {
	Src    string
	Srcset string
	Sizes  string
}

var widths = []int{160, 320, 480, 640, 800, 1200, 1600}

// Picture is a picture's address at width. One stored on Whisk (/.whisk/img/<id>) is resized by
// the edge, which answers on every name of the app, so it is given on the page's own address,
// with a set of widths up to twice the one shown. Any other address is used as it is.
func Picture(u string, width int) Pic {
	at := strings.Index(u, "/.whisk/img/")
	switch {
	case u == "":
		return Pic{}
	case at < 0:
		return Pic{Src: u}
	}
	base, _, _ := strings.Cut(u[at:], "?")
	sized := func(w int) string { return fmt.Sprintf("%s?w=%d&format=auto", base, w) }
	ws := uniq(append(filter(widths, func(w int) bool { return w < width*2 }), width, width*2))
	sortInts(ws)
	return Pic{
		Src:    sized(width),
		Srcset: strings.Join(mapOf(ws, func(w int) string { return fmt.Sprintf("%s %dw", sized(w), w) }), ", "),
		Sizes:  fmt.Sprintf("%dpx", width),
	}
}

func sortInts(xs []int) {
	for i := 1; i < len(xs); i++ {
		for j := i; j > 0 && xs[j] < xs[j-1]; j-- {
			xs[j], xs[j-1] = xs[j-1], xs[j]
		}
	}
}

// ScaledHeight is the height a picture draws at width, keeping its shape; 0 when unknown.
func ScaledHeight(m Media, width int) int {
	if m.Width == 0 || m.Height == 0 {
		return 0
	}
	return (width*m.Height + m.Width/2) / m.Width
}

// Lines are the non-empty lines of a text, trimmed.
func Lines(v any) []string {
	return filter(mapOf(strings.Split(strings.ReplaceAll(str(v), "\r\n", "\n"), "\n"), strings.TrimSpace), func(s string) bool { return s != "" })
}

// Tel is a phone number as a tel: link.
func Tel(v any) template.URL {
	keep := strings.Map(func(r rune) rune {
		if r == '+' || (r >= '0' && r <= '9') {
			return r
		}
		return -1
	}, str(v))
	return template.URL("tel:" + keep) //nolint:gosec // digits and + only
}

// Img is a picture as an <img> at the width the layout shows it; nothing when there is none.
// v is a picture field (an object with url, alt, width and height) or an address. eager is for a
// picture at the top of a page, which loads at once. sizes says how wide it shows when the
// layout makes it wider than width.
func Img(v any, width int, eager bool, class, sizes string) template.HTML {
	m := AsMedia(v)
	if s, ok := v.(string); ok {
		m = Media{URL: s}
	}
	pic := Picture(m.URL, width)
	if pic.Src == "" {
		return ""
	}
	return ImgTag(ImgAttrs{
		Class: class, Src: pic.Src, Srcset: pic.Srcset, Sizes: pick(sizes != "", sizes, pic.Sizes), Alt: m.Alt,
		Width: width, Height: ScaledHeight(m, width), Loading: pick(eager, "eager", "lazy"), Priority: pick(eager, "high", "auto"),
	})
}

// ImgAttrs are an <img>'s attributes; an empty one (a zero height) is left out.
type ImgAttrs struct {
	Class, Src, Srcset, Sizes, Alt string
	Width, Height                  int
	Loading, Priority              string
}

// imgTag escapes every attribute as html/template does in a page.
var imgTag = template.Must(template.New("img").Parse(`<img{{with .Class}} class="{{.}}"{{end}} src="{{.Src}}"` +
	`{{with .Srcset}} srcset="{{.}}"{{end}}{{with .Sizes}} sizes="{{.}}"{{end}} alt="{{.Alt}}" width="{{.Width}}"` +
	`{{with .Height}} height="{{.}}"{{end}} loading="{{.Loading}}" decoding="async" fetchpriority="{{.Priority}}">`))

// ImgTag is an <img> with its attributes escaped; nothing without an address.
func ImgTag(a ImgAttrs) template.HTML {
	if a.Src == "" {
		return ""
	}
	var b bytes.Buffer
	if imgTag.Execute(&b, a) != nil {
		return ""
	}
	// doctor: allow W097 html/template's own escaped output
	return template.HTML(b.String()) //nolint:gosec // html/template's own escaped output
}
