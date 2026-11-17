// The editor (Payload, cms/) runs beside the website's server while the site carries its own copy:
// the server starts it on a port of this machine's own, starts it again when it stops, and passes
// /cms (the editor and its API) and /_next (its files) to it. Nothing outside the app reaches that
// port. When Whisk's content engine answers the site (WHISK_CONTENT_URL, set by the node for a
// site whose whisk.yaml says `content: payload`) or CMS_URL names another editor, the server
// starts none and reads content there; so it does when cms/ has no built editor.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// contentURL is where the pages read content when the editor runs elsewhere: Whisk's content
// engine, which the node names, else CMS_URL; "" when the editor runs here.
func contentURL(getenv func(string) string) string {
	return strings.TrimRight(pick(getenv("WHISK_CONTENT_URL") != "", getenv("WHISK_CONTENT_URL"), getenv("CMS_URL")), "/")
}

// RestartDelay is how long to wait before starting the editor again after it stopped failures
// times in a row: a second, doubling to a minute, so an editor that cannot start does not spin.
func RestartDelay(failures int) time.Duration {
	if failures < 1 {
		failures = 1
	}
	if failures > 7 {
		return time.Minute
	}
	return min(time.Minute, time.Second<<(failures-1))
}

// editorCommand is the command that runs the editor in dir, or false when it is not built.
func editorCommand(dir string, port string, develop bool) (*exec.Cmd, bool) {
	next := filepath.Join(dir, "node_modules", "next", "dist", "bin", "next")
	if _, err := os.Stat(next); err != nil {
		return nil, false
	}
	mode := pick(develop, "dev", "start")
	cmd := exec.Command("node", next, mode, "-p", port, "-H", "127.0.0.1") //nolint:noctx // lives as long as the server; stopped by its own signal
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "PORT="+port, "NODE_ENV="+pick(develop, "development", "production"), "NEXT_TELEMETRY_DISABLED=1")
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	return cmd, true
}

// runEditor keeps the editor running until ctx ends. It reports whether there is one to run.
func runEditor(ctx context.Context, dir, port string, develop bool) bool {
	if _, ok := editorCommand(dir, port, develop); !ok {
		slog.Info("cms: no built editor here, so /cms is not served by this app", "dir", dir)
		return false
	}
	go func() {
		failures := 0
		for ctx.Err() == nil {
			cmd, _ := editorCommand(dir, port, develop)
			started := time.Now()
			if err := cmd.Start(); err == nil {
				done := make(chan struct{})
				go func() {
					if err := cmd.Wait(); err != nil {
						slog.Warn("cms: exited", "error", err.Error())
					}
					close(done)
				}()
				select {
				case <-ctx.Done():
					_ = cmd.Process.Signal(os.Interrupt)
					<-done
					return
				case <-done:
				}
			}
			failures = pick(time.Since(started) > 2*time.Minute, 1, failures+1)
			slog.Warn("cms: stopped; starting again", "inSeconds", RestartDelay(failures).Seconds())
			select {
			case <-ctx.Done():
				return
			case <-time.After(RestartDelay(failures)):
			}
		}
	}()
	return true
}

// editorProxy passes a request to the editor and its answer back, streamed both ways.
func editorProxy(base string) http.Handler {
	target, _ := url.Parse(base)
	// The editor sees the request as the browser sent it: its own Host and the edge's forwarded
	// headers, which it uses for the addresses it writes.
	p := &httputil.ReverseProxy{Rewrite: func(pr *httputil.ProxyRequest) {
		pr.SetURL(target)
		pr.Out.Host = pr.In.Host
		for _, h := range []string{"X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto"} {
			if v := pr.In.Header.Values(h); len(v) > 0 {
				pr.Out.Header[h] = v
			}
		}
	}}
	p.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, _ error) {
		w.Header().Set("content-type", "application/json")
		w.Header().Set("retry-after", "5")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write(ErrorBody("CMS_UNAVAILABLE", "The site editor is starting.", "Try again in a few seconds."))
	}
	return p
}
