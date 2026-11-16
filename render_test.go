package main

import (
	"encoding/json"
	"html/template"
	"os"
	"strings"
	"testing"
)

func theme(t *testing.T) Theme {
	t.Helper()
	th, err := LoadTheme(os.DirFS("theme"), "site.css", nil)
	if err != nil {
		t.Fatal(err)
	}
	return th
}

func pageFrom(t *testing.T, src string) ContentPage {
	t.Helper()
	var p ContentPage
	if err := json.Unmarshal([]byte(src), &p); err != nil {
		t.Fatal(err)
	}
	return p
}

func render(t *testing.T, v View) string {
	t.Helper()
	th := theme(t)
	v.CSS = th.CSS()
	b, err := th.Render("site", v)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

// Every block the theme draws, with what the editor gives for it.
func TestBlocks(t *testing.T) {
	p := pageFrom(t, `{"id":1,"path":"/","title":"Home","layout":[
		{"blockType":"hero","heading":"Fresh coffee","text":"Roasted daily","link":{"label":"Visit","url":"/visit"},"image":{"url":"/.whisk/img/3","alt":"Beans","width":1600,"height":900}},
		{"blockType":"content","content_html":"<p>We <strong>roast</strong>.</p>"},
		{"blockType":"media","image":{"url":"/v.mp4","mimeType":"video/mp4"},"caption":"Roasting"},
		{"blockType":"media","wide":true,"image":{"url":"/.whisk/img/4","alt":"Shop"}},
		{"blockType":"columns","heading":"Why us","items":[{"heading":"Beans","text":"Good ones","link":{"label":"More","url":"/beans"}},{"heading":"No link"}]},
		{"blockType":"list","list":"faqs","heading":"Questions","entries":[{"question":"Open Sundays?","answer_html":"<p>Yes</p>"}]},
		{"blockType":"list","list":"locations","entries":[{"name":"Main St","address":"1 Main St\n\nSpringfield","phone":"(555) 010-0000","hours":"Mon-Fri"}]},
		{"blockType":"list","list":"people","entries":[]},
		{"blockType":"form","name":"contact","heading":"Write to us","submit":"Send","thanks":"Thanks!","fields":[{"name":"email","label":"Email","type":"email","required":true},{"name":"message","label":"Message","type":"textarea"},{"name":"news","label":"News","type":"checkbox"}]},
		{"blockType":"html","html":"<div id=\"own\">mine</div>"},
		{"blockType":"unknown","heading":"never drawn"},
		{"blockType":"../site","heading":"never drawn"}
	]}`)
	out := render(t, PageView("Website", "https://example.com", Request{Path: "/"}, Menus{Name: "Maple Street", Header: []Link{{Label: "Menu", URL: "/menu"}}}, p, true, false, 2026))
	for _, want := range []string{
		"<title>Maple Street</title>",
		`<link rel="canonical" href="https://example.com/">`,
		"<h1>Fresh coffee</h1>",
		`<a class="button" href="/visit">Visit</a>`,
		`src="/.whisk/img/3?w=720&amp;format=auto"`,
		`/.whisk/img/3?w=1440&amp;format=auto 1440w"`,
		`height="405"`,
		`loading="eager"`,
		"<p>We <strong>roast</strong>.</p>",
		`<video src="/v.mp4" controls preload="metadata"></video>`,
		`<figure class="block media wide">`,
		`/.whisk/img/4?w=1200&amp;format=auto`,
		`<a href="/beans">More</a>`,
		"<summary>Open Sundays?</summary>",
		"<address>1 Main St<br>Springfield</address>",
		`href="tel:5550100000"`,
		`<form method="post" action="/forms/contact">`,
		`<input id="contact-email" name="email" type="email" required autocomplete="email">`,
		`<textarea id="contact-message" name="message" rows="5"></textarea>`,
		`<div id="own">mine</div>`,
		`<a href="/menu">Menu</a>`,
		"© 2026 Maple Street",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %s", want)
		}
	}
	for _, never := range []string{"never drawn", "&lt;no value&gt;", "<no value>", "list-people", "noindex", "whisk-preview.js"} {
		if strings.Contains(out, never) {
			t.Errorf("drew %s", never)
		}
	}
}

func TestPageViews(t *testing.T) {
	sent := render(t, PageView("Website", "https://example.com", Request{Path: "/contact", Query: "sent=contact"}, Menus{},
		pageFrom(t, `{"path":"/contact","title":"Contact","layout":[{"blockType":"form","name":"contact","thanks":"Thanks!","fields":[]}]}`), true, false, 2026))
	if !strings.Contains(sent, `<p class="notice" role="status">Thanks!</p>`) || strings.Contains(sent, "<form") {
		t.Error("a sent form shows its thanks")
	}
	missing := PageView("Website", "https://example.com", Request{Path: "/nope"}, Menus{}, ContentPage{}, false, false, 2026)
	if missing.Status != 404 || !missing.Noindex || !strings.Contains(render(t, missing), "We couldn't find that page") {
		t.Error("not found")
	}
	preview := PageView("Website", "https://example.com", Request{Path: "/a"}, Menus{}, pageFrom(t, `{"path":"/a","title":"A","head":"<meta name=\"x\" content=\"y\">"}`), true, true, 2026)
	out := render(t, preview)
	if !preview.Noindex || !strings.Contains(out, "whisk-preview.js") || !strings.Contains(out, `<meta name="x" content="y">`) || !strings.Contains(out, "<title>A | Website</title>") {
		t.Error("a preview")
	}
	escaped := render(t, PageView("Website", "https://example.com", Request{Path: "/"}, Menus{}, pageFrom(t, `{"path":"/","layout":[{"blockType":"hero","heading":"<script>x</script>"}]}`), true, false, 2026))
	if strings.Contains(escaped, "<script>x</script>") {
		t.Error("words from the editor are escaped")
	}
}

func TestPictures(t *testing.T) {
	if Picture("", 400) != (Pic{}) || Picture("https://cdn.example/a.jpg", 400) != (Pic{Src: "https://cdn.example/a.jpg"}) {
		t.Error("plain addresses")
	}
	if got := Picture("https://shop.example/.whisk/img/7?x=1", 400); got != (Pic{Src: "/.whisk/img/7?w=400&format=auto", Sizes: "400px",
		Srcset: "/.whisk/img/7?w=160&format=auto 160w, /.whisk/img/7?w=320&format=auto 320w, /.whisk/img/7?w=400&format=auto 400w, /.whisk/img/7?w=480&format=auto 480w, /.whisk/img/7?w=640&format=auto 640w, /.whisk/img/7?w=800&format=auto 800w"}) {
		t.Errorf("%+v", got)
	}
	if Img(7.0, 400, false, "", "") != "" {
		t.Error("a picture not read with the page draws nothing")
	}
	if got := Img(map[string]any{"url": "/a.png", "alt": `"x"`}, 64, false, "face", ""); got != template.HTML(`<img class="face" src="/a.png" alt="&#34;x&#34;" width="64" loading="lazy" decoding="async" fetchpriority="auto">`) {
		t.Errorf("%s", got)
	}
	if Lines("a\r\n\n b ")[1] != "b" || string(Tel("+1 (555) 010")) != "tel:+1555010" {
		t.Error("lines and tel")
	}
}
