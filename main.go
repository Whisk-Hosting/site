// The website's server: one Go process in front of everything the site is. What it does with
// each request is decided by Decide (route.go), a pure function; this file carries it out. Pages
// are drawn from the theme (theme/, render.go) with content read from the content engine
// (content.go); files come from public/. `server migrate` makes the table form posts are kept in.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Config is what the server reads from its environment and its folder, once, at start.
type Config struct {
	Port    string
	Root    string
	Name    string
	Content string // the content engine's address
	CMSPort string // the loopback port of the content engine the server starts, when it starts one
	// Whisk's content engine answers the site: drafts are read through the site's own address.
	DraftsAtSite bool
	Develop      bool
}

func configFrom(getenv func(string) string, args []string) Config {
	or := func(v, d string) string { return pick(v != "", v, d) }
	cmsPort := or(getenv("CMS_PORT"), "9100")
	return Config{
		Port:         or(getenv("PORT"), "8080"),
		Root:         ".",
		Name:         or(getenv("WHISK_APP_NAME"), "Website"),
		Content:      or(contentURL(getenv), "http://127.0.0.1:"+cmsPort),
		CMSPort:      pick(contentURL(getenv) == "", cmsPort, ""),
		DraftsAtSite: getenv("WHISK_CONTENT_URL") != "",
		Develop:      some(args, func(a string) bool { return a == "--develop" }),
	}
}

// server is the shell's state: set at start, read by every request, never changed.
type server struct {
	cfg     Config
	site    Site
	theme   func() (Theme, error)
	content Content
	db      *pgxpool.Pool
	editor  http.Handler
	// engineHere: the server started the content engine, so it is ready once the engine answers.
	engineHere bool
	robots     string
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if err := run(); err != nil {
		slog.Error("the server stopped", "error", err.Error())
		os.Exit(1)
	}
}

func run() error {
	cfg := configFrom(os.Getenv, os.Args[1:])
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	defer stop()
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		return migrate(ctx, os.Getenv("DATABASE_URL"))
	}

	var err error
	at := func(f string) string { return filepath.Join(cfg.Root, f) }
	read := func(f string) []byte { b, _ := os.ReadFile(at(f)); return b }
	key := ""
	if cfg.CMSPort != "" {
		if key, err = newKey(); err != nil {
			return err
		}
		if err := runEngine(ctx, engineFor(os.Getenv, cfg.Root, cfg.CMSPort, key), cfg.Root); err != nil {
			return err
		}
	}

	theme, err := LoadTheme(os.DirFS(at("theme")), "site.css", nil)
	if err != nil {
		return fmt.Errorf("the theme does not parse: %w", err)
	}
	s := &server{
		cfg: cfg,
		site: Site{
			Redirects: ParseRedirects(read("redirects.json")),
			Sitemaps:  ParseSitemaps(read("sitemaps.json")),
			Public:    at("public"),
			Has:       isFile,
		},
		// In development the theme is read again on each page, so an edit shows on reload.
		theme:      pick(cfg.Develop, func() (Theme, error) { return LoadTheme(os.DirFS(at("theme")), "site.css", nil) }, func() (Theme, error) { return theme, nil }),
		content:    NewHTTPContent(cfg.Content, cfg.DraftsAtSite, key),
		editor:     editorProxy(cfg.Content, key),
		engineHere: key != "",
		robots:     string(read("robots.txt")),
	}
	if url := os.Getenv("DATABASE_URL"); url != "" {
		pc, err := pgxpool.ParseConfig(url)
		if err != nil {
			return fmt.Errorf("DATABASE_URL: %w", err)
		}
		pc.MaxConns = 3
		pc.ConnConfig.ConnectTimeout = 5 * time.Second
		if s.db, err = pgxpool.NewWithConfig(ctx, pc); err != nil {
			return err
		}
		defer s.db.Close()
	}

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: withHealth(s, s.ready), ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 150 * time.Second}
	go func() {
		<-ctx.Done()
		shut, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shut)
	}()
	slog.Info("listening", "port", cfg.Port, "content", cfg.Content, "engineHere", key != "")
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func isFile(f string) bool {
	st, err := os.Stat(f)
	return err == nil && st.Mode().IsRegular()
}

// requestOf is what Decide reads of r.
func requestOf(r *http.Request) Request {
	h := make(map[string]string, len(r.Header))
	for k, v := range r.Header {
		h[strings.ToLower(k)] = strings.Join(v, ",")
	}
	h["host"] = r.Host // Go keeps it out of the headers; a draft is read at the site's own address
	return Request{Method: r.Method, Path: r.URL.Path, Query: r.URL.RawQuery, Headers: h}
}

func (s *server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	req := requestOf(r)
	a := Decide(s.site, req)
	switch a.Kind {
	case Health:
		s.ready(w, r)
	case Form:
		s.form(w, r, a.Form)
	case Go:
		w.Header().Set("cache-control", "no-store")
		http.Redirect(w, r, a.Location, http.StatusFound)
	case Editor:
		s.editor.ServeHTTP(w, r)
	case Moved:
		w.Header().Set("cache-control", "public, max-age=300")
		if a.Moved.Status == http.StatusGone {
			w.Header().Set("content-type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusGone)
			_, _ = io.WriteString(w, "This page has been removed.")
			return
		}
		http.Redirect(w, r, a.Moved.To, a.Moved.Status)
	case Static:
		s.static(w, r, a.File)
	case Sitemap:
		s.sitemap(w, r, req)
	case Robots:
		w.Header().Set("content-type", "text/plain; charset=utf-8")
		w.Header().Set("cache-control", "public, max-age=3600")
		_, _ = io.WriteString(w, RobotsTxt(origin(r), s.robots))
	case Page:
		s.page(w, r, req)
	}
}

// origin is the address the browser used. Only Whisk's edge reaches the app, and only for the
// app's own names, so Host and X-Forwarded-Proto are trusted.
func origin(r *http.Request) string {
	proto := r.Header.Get("x-forwarded-proto")
	return pick(proto == "", "http", proto) + "://" + r.Host
}

func writeError(w http.ResponseWriter, status int, code, message, fix string) {
	w.Header().Set("content-type", "application/json")
	w.Header().Set("cache-control", "no-store")
	w.WriteHeader(status)
	_, _ = w.Write(ErrorBody(code, message, fix))
}

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	var failed []string
	if s.db == nil {
		failed = append(failed, "database: DATABASE_URL is not set")
	} else if err := s.db.Ping(ctx); err != nil {
		failed = append(failed, "database: "+err.Error())
	}
	if s.engineHere {
		if _, err := s.content.Listed(ctx, Asker{}); err != nil {
			failed = append(failed, "content engine: "+err.Error())
		}
	}
	if len(failed) > 0 {
		w.Header().Set("retry-after", "5")
		writeError(w, http.StatusServiceUnavailable, "NOT_READY", "Not ready: "+strings.Join(failed, "; ")+".", "Wait for the database and the content engine to start.")
		return
	}
	w.Header().Set("content-type", "application/json")
	w.Header().Set("cache-control", "no-store")
	_, _ = io.WriteString(w, `{"ok":true}`)
}

// form keeps a form's entry in form_entries (migrate), then goes back to the page it came
// from. The edge's challenge (whisk.yaml) keeps robots out.
func (s *server) form(w http.ResponseWriter, r *http.Request, name string) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 64<<10+1))
	switch {
	case err != nil:
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "The form could not be read.", "Send the form again.")
		return
	case len(body) > 64<<10:
		writeError(w, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "The form was too large.", "Send less than 64 KB; attach large files by email instead.")
		return
	}
	fields, ok := FormFields(r.Header.Get("content-type"), body)
	switch {
	case !ok:
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "The form could not be read.", "Post the form's fields as a form or as a JSON object.")
		return
	case !AnyFilled(fields):
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "The form was empty.", "Fill in at least one field.")
		return
	case s.db == nil:
		writeError(w, http.StatusServiceUnavailable, "NOT_READY", "Forms are not connected to a database here.", "Set DATABASE_URL.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	referer := r.Header.Get("referer")
	if _, err := s.db.Exec(ctx, "insert into form_entries (form, page, data) values ($1, $2, $3)", name, pick[any](referer == "", nil, referer), fields); err != nil {
		slog.Error("form entry not kept", "form", name, "error", err.Error())
		writeError(w, http.StatusServiceUnavailable, "NOT_READY", "The form could not be kept just now.", "Send it again in a moment.")
		return
	}
	http.Redirect(w, r, FormReturn(referer, name), http.StatusSeeOther)
}

func (s *server) static(w http.ResponseWriter, r *http.Request, f StaticFile) {
	v := FileVariantFor(f, r.Header.Get("accept"), r.Header.Get("accept-encoding"), isFile)
	file, err := os.Open(v.File)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	h := w.Header()
	h.Set("content-type", pick(v.Type != "", v.Type, f.Type))
	h.Set("cache-control", f.Cache)
	if v.Encoding != "" {
		h.Set("content-encoding", v.Encoding)
	}
	if v.Vary != "" {
		h.Set("vary", v.Vary)
	}
	if st, err := file.Stat(); err == nil {
		h.Set("content-length", fmt.Sprint(st.Size()))
	}
	if r.Method == http.MethodHead {
		return
	}
	_, _ = io.Copy(w, file)
}

func askerOf(req Request, preview bool) Asker {
	return Asker{Preview: preview, Identity: req.Headers}
}

func (s *server) sitemap(w http.ResponseWriter, r *http.Request, req Request) {
	pages, err := s.content.Listed(r.Context(), askerOf(req, false))
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "CMS_UNAVAILABLE", "The site's pages could not be listed just now.", "Try again in a few seconds.")
		return
	}
	w.Header().Set("content-type", "application/xml; charset=utf-8")
	w.Header().Set("cache-control", "public, max-age=3600")
	_, _ = io.WriteString(w, SitemapXML(origin(r), mapOf(pages, func(p ContentPage) SitemapEntry { return SitemapEntry{Path: p.Path, Updated: p.UpdatedAt} })))
}

// page draws the page at the request's address. A page asked for without, or with, its last
// slash goes to the address it has. Pages are drawn fresh for the team, who may be previewing; the
// edge keeps everyone else's a few minutes.
func (s *server) page(w http.ResponseWriter, r *http.Request, req Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("allow", "GET, HEAD")
		writeError(w, http.StatusMethodNotAllowed, "INVALID_REQUEST", "A page is only read.", "Use GET.")
		return
	}
	staff := IsStaff(req.Headers)
	ask := askerOf(req, staff && r.URL.Query().Get("preview") == "1")
	theme, err := s.theme()
	if err != nil {
		s.oneMoment(w, err)
		return
	}
	found, ok, err := s.content.PageAt(r.Context(), ask, req.Path)
	if err != nil {
		s.oneMoment(w, err)
		return
	}
	if !ok {
		if other, has := OtherForm(req.Path); has {
			if there, ok, _ := s.content.PageAt(r.Context(), ask, other); ok {
				w.Header().Set("location", LocalPath(there.Path)+withMark(req.Query))
				w.WriteHeader(http.StatusMovedPermanently)
				return
			}
		}
	}
	menus := s.content.Menus(r.Context(), ask)
	view := PageView(s.cfg.Name, origin(r), req, menus, found, ok, ask.Preview, time.Now().Year())
	view.CSS = theme.CSS()
	body, err := theme.Render("site", view)
	if err != nil {
		s.oneMoment(w, err)
		return
	}
	w.Header().Set("content-type", "text/html; charset=utf-8")
	w.Header().Set("cache-control", pick(staff, "private, no-store", "public, max-age=300"))
	w.WriteHeader(view.Status)
	if r.Method != http.MethodHead {
		_, _ = w.Write(body)
	}
}

// oneMoment is the page shown when a page fails. It uses no theme or menus, which may be what
// failed, and tries again by itself.
func (s *server) oneMoment(w http.ResponseWriter, err error) {
	slog.Error("page failed", "error", err.Error())
	w.Header().Set("content-type", "text/html; charset=utf-8")
	w.Header().Set("cache-control", "no-store")
	w.Header().Set("retry-after", "15")
	w.WriteHeader(http.StatusServiceUnavailable)
	_, _ = io.WriteString(w, oneMomentPage)
}

const oneMomentPage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="15"><title>One moment</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;padding:16px;text-align:center}</style></head><body><main><h1>One moment</h1><p>This page tries again by itself.</p><p><a href="/">Home</a></p></main></body></html>`

// withHealth is the server's handler with the platform's health check routed by name, as the
// manifest's health.path says; the handler answers everything else.
func withHealth(h http.Handler, ready http.HandlerFunc) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health/ready", ready)
	mux.Handle("/", h)
	return mux
}

// formEntries is the table a form's entries are kept in, which the editor's Enquiries reads.
const formEntries = `create table if not exists form_entries (
  id bigint generated always as identity primary key,
  form text not null,
  page text,
  data jsonb not null,
  created_at timestamptz not null default now()
)`

// migrate makes the table form posts are kept in (the migrate step in whisk.yaml), with the
// direct database connection, before traffic moves to the new version. Safe on every deploy. The
// editor's own tables are the content engine's, which makes and moves them itself.
func migrate(ctx context.Context, url string) error {
	if url == "" {
		return errors.New("DATABASE_URL is not set: run the migrate step with whisk dev or whisk deploy, which set it")
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, url)
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec(ctx, formEntries)
	return err
}
