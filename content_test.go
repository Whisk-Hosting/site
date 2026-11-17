package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sync/atomic"
	"testing"
	"time"
)

func TestKept(t *testing.T) {
	t0 := time.Unix(0, 0)
	empty := Kept{}
	one := empty.Keep("a", []byte("1"), t0)
	if _, ok := empty.Within("a", t0, time.Hour); ok {
		t.Error("keeping changed the value it was given")
	}
	if b, ok := one.Within("a", t0.Add(14*time.Second), fresh); !ok || string(b) != "1" {
		t.Error("a fresh answer is used")
	}
	if _, ok := one.Within("a", t0.Add(15*time.Second), fresh); ok {
		t.Error("an answer past fresh is asked again")
	}
	many := one
	for i := 0; i < keptLimit+5; i++ {
		many = many.Keep(string(rune('b'+i)), nil, t0)
	}
	if len(many.answers) != keptLimit || len(many.order) != keptLimit {
		t.Errorf("kept %d, want %d", len(many.answers), keptLimit)
	}
	if _, ok := many.Within("a", t0, time.Hour); ok {
		t.Error("the oldest answer goes first")
	}
}

func TestForSite(t *testing.T) {
	all, nz, au := ContentPage{Title: "all"}, ContentPage{Title: "nz", Market: "nz"}, ContentPage{Title: "au", Market: "au"}
	cases := []struct {
		docs   []ContentPage
		market string
		want   string
	}{
		{[]ContentPage{all, nz}, "nz", "nz"},
		{[]ContentPage{nz, all}, "", "all"},
		{[]ContentPage{au}, "nz", ""},
		{[]ContentPage{au, all}, "nz", "all"},
	}
	for i, c := range cases {
		got, _ := ForSite(c.docs, c.market)
		if got.Title != c.want {
			t.Errorf("%d: %q, want %q", i, got.Title, c.want)
		}
	}
	listed := ListedForSite([]ContentPage{{Path: "/a"}, {Path: "/a", Market: "nz", Noindex: true}, {Path: "/b"}}, "nz")
	if len(listed) != 1 || listed[0].Path != "/b" {
		t.Errorf("listed: %+v", listed)
	}
}

func TestAddresses(t *testing.T) {
	for in, want := range map[string]string{"/🍺-tips/": "/%F0%9F%8D%BA-tips/", "/māori/": "/m%C4%81ori/"} {
		if got, ok := EncodedForm(in); !ok || got != want {
			t.Errorf("EncodedForm(%q) = %q", in, got)
		}
	}
	for _, in := range []string{"/about/", "/"} {
		if _, ok := EncodedForm(in); ok {
			t.Errorf("%s reads the same either way", in)
		}
	}
	if o, ok := OtherForm("/a/"); !ok || o != "/a" {
		t.Error("/a/")
	}
	if o, ok := OtherForm("/a"); !ok || o != "/a/" {
		t.Error("/a")
	}
	if _, ok := OtherForm("/"); ok {
		t.Error("/")
	}
}

// An engine answering in Payload's shape: published content is kept, drafts are asked each time
// with who is asking, and a kept answer stands in while the engine cannot answer.
func TestHTTPContent(t *testing.T) {
	var calls, down atomic.Int32
	var lastRoles atomic.Value
	lastRoles.Store("")
	engine := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		lastRoles.Store(r.Header.Get("x-whisk-roles"))
		if down.Load() == 1 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/cms/api/pages":
			if r.URL.Query().Get("where[path][equals]") == "/%F0%9F%8D%BA/" {
				_, _ = w.Write([]byte(`{"docs":[{"id":9,"path":"/%F0%9F%8D%BA/","title":"Beer"}],"hasNextPage":false}`))
				return
			}
			if r.URL.Query().Get("where[path][equals]") == "/about/" || r.URL.Query().Get("page") == "1" || r.URL.Query().Get("where[or][0][path][equals]") == "/about/" {
				_, _ = w.Write([]byte(`{"docs":[{"id":7,"path":"/about/","title":"About","updatedAt":"2026-10-10T00:00:00Z","layout":[{"blockType":"hero","heading":"Hi"}]}],"hasNextPage":false}`))
				return
			}
			_, _ = w.Write([]byte(`{"docs":[],"hasNextPage":false}`))
		case "/cms/api/globals/menus":
			_, _ = w.Write([]byte(`{"name":"Maple Street","header":[{"label":"Home","url":"/"}]}`))
		}
	}))
	defer engine.Close()
	now := time.Unix(1000, 0)
	c := NewHTTPContent(engine.URL, false, "")
	c.Now = func() time.Time { return now }
	ctx := context.Background()

	p, ok, err := c.PageAt(ctx, Asker{}, "/about/")
	if err != nil || !ok || p.Title != "About" || p.ID.String() != "7" || p.Layout[0]["heading"] != "Hi" {
		t.Fatalf("page: %+v %v %v", p, ok, err)
	}
	before := calls.Load()
	_, _, _ = c.PageAt(ctx, Asker{}, "/about/")
	if calls.Load() != before {
		t.Error("a fresh published page is not asked again")
	}
	_, _, _ = c.PageAt(ctx, Asker{Preview: true, Identity: team}, "/about/")
	if calls.Load() != before+1 || lastRoles.Load() != "owner" {
		t.Error("a preview asks each time, as the person")
	}
	if p, ok, _ := c.PageAt(ctx, Asker{}, "/🍺/"); !ok || p.Title != "Beer" {
		t.Error("a page kept percent-encoded is found")
	}
	if _, ok, err := c.PageAt(ctx, Asker{}, "/nope"); ok || err != nil {
		t.Error("no page is not an error")
	}
	if m := c.Menus(ctx, Asker{}); m.Name != "Maple Street" || len(m.Header) != 1 {
		t.Errorf("menus: %+v", m)
	}
	if l, err := c.Listed(ctx, Asker{}); err != nil || len(l) != 1 {
		t.Errorf("listed: %+v %v", l, err)
	}

	down.Store(1)
	now = now.Add(time.Hour)
	if p, ok, err := c.PageAt(ctx, Asker{}, "/about/"); err != nil || !ok || p.Title != "About" {
		t.Error("a kept page stands in while the engine cannot answer")
	}
	if _, _, err := c.PageAt(ctx, Asker{Preview: true}, "/about/"); err == nil {
		t.Error("a preview is never an old draft")
	}
	if m := c.Menus(context.Background(), Asker{Preview: true}); m.Name != "" {
		t.Error("menus that cannot be read are none")
	}
	now = now.Add(25 * time.Hour)
	if _, _, err := c.PageAt(ctx, Asker{}, "/about/"); err == nil {
		t.Error("a day-old page does not stand in")
	}
}

func TestDraftsVia(t *testing.T) {
	team := map[string]string{"host": "www.example.com", "cookie": "whisk_session=a", "x-whisk-user-id": "u1", "x-whisk-roles": "admin", "x-other": "x"}
	cases := []struct {
		name    string
		atSite  bool
		key     string
		a       Asker
		to      string
		headers map[string]string
		ok      bool
	}{
		{"published reads go to the engine as a visitor's", true, "k", Asker{Identity: team}, "http://engine", nil, true},
		{"drafts from the engine the server started carry the edge's identity and its key", false, "k", Asker{Preview: true, Identity: team}, "http://engine", map[string]string{"x-whisk-user-id": "u1", "x-whisk-roles": "admin", "x-whisk-content-key": "k"}, true},
		{"drafts from another engine carry the identity alone", false, "", Asker{Preview: true, Identity: team}, "http://engine", map[string]string{"x-whisk-user-id": "u1", "x-whisk-roles": "admin"}, true},
		{"drafts from Whisk's engine go through the site with the cookie alone", true, "", Asker{Preview: true, Identity: team}, "https://www.example.com", map[string]string{"cookie": "whisk_session=a"}, true},
		{"no cookie, no identity", true, "", Asker{Preview: true, Identity: map[string]string{"host": "www.example.com"}}, "https://www.example.com", map[string]string{}, true},
		{"no host to ask", true, "", Asker{Preview: true, Identity: map[string]string{"cookie": "a"}}, "", nil, false},
		{"a host that is not one", true, "", Asker{Preview: true, Identity: map[string]string{"host": "evil.example/x"}}, "", nil, false},
		{"a host with a user", true, "", Asker{Preview: true, Identity: map[string]string{"host": "a@evil.example"}}, "", nil, false},
	}
	for _, c := range cases {
		to, headers, ok := DraftsVia("http://engine", c.atSite, c.key, c.a)
		if to != c.to || ok != c.ok || !reflect.DeepEqual(headers, c.headers) {
			t.Errorf("%s: got %q %v %v, want %q %v %v", c.name, to, headers, ok, c.to, c.headers, c.ok)
		}
	}
}
