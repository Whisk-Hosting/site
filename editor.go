// The site editor and its API (/cms) are Whisk's content engine. On Whisk's node it answers the
// site itself (WHISK_CONTENT_URL, set for a site whose whisk.yaml says `content: payload`) and the
// edge sends /cms there, so the server starts nothing. Elsewhere (a preview, whisk dev) the server
// starts the engine beside it with `content serve`, on a loopback port only, with a key it makes
// at start, keeps it running, and passes /cms to it with that key and the edge's identity, so the
// engine knows who is asking. CMS_URL names another engine instead, and the server starts none.
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
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

// contentKeyHeader carries the key that makes a request through the server's /cms count as the
// edge's: only the server sets it, and never as a browser sent it.
const contentKeyHeader = "X-Whisk-Content-Key"

// contentURL is where the pages read content when the engine runs elsewhere: Whisk's content
// engine, which the node names, else CMS_URL; "" when the server starts it here.
func contentURL(getenv func(string) string) string {
	return strings.TrimRight(pick(getenv("WHISK_CONTENT_URL") != "", getenv("WHISK_CONTENT_URL"), getenv("CMS_URL")), "/")
}

// Engine is the content engine the server starts beside it: its program, the loopback address it
// listens on and the key the server passes it.
type Engine struct {
	Bin    string
	Listen string
	Key    string
}

// engineFor is the engine to start beside the server, reading content on port: the program whisk
// dev downloaded (WHISK_CONTENT_ENGINE), else the one the image carries (engine/content). Pure.
func engineFor(getenv func(string) string, root, port, key string) Engine {
	// doctor: allow W020 the engine beside the server answers the server alone; the app's port is the server's
	return Engine{Bin: pick(getenv("WHISK_CONTENT_ENGINE") != "", getenv("WHISK_CONTENT_ENGINE"), filepath.Join(root, "engine", "content")), Listen: "127.0.0.1:" + port, Key: key}
}

// EngineEnv is what the engine is started with beyond the app's own environment (its database,
// its queue and its service token, which uploads use). Pure.
func EngineEnv(e Engine) []string {
	return []string{"WHISK_CONTENT_KEY=" + e.Key, "WHISK_CONTENT_LISTEN=" + e.Listen}
}

// newKey is a key no one else knows: 32 random bytes, as 64 hex characters.
func newKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// RestartDelay is how long to wait before starting the engine again after it stopped failures
// times in a row: a second, doubling to a minute, so an engine that cannot start does not spin.
func RestartDelay(failures int) time.Duration {
	if failures < 1 {
		failures = 1
	}
	if failures > 7 {
		return time.Minute
	}
	return min(time.Minute, time.Second<<(failures-1))
}

// runEngine keeps the engine running until ctx ends; an error when there is none to run.
func runEngine(ctx context.Context, e Engine, dir string) error {
	if st, err := os.Stat(e.Bin); err != nil || !st.Mode().IsRegular() {
		return fmt.Errorf("whisk's content engine is not at %s, and WHISK_CONTENT_URL names none: run the site with whisk dev, which downloads it, or deploy it with whisk deploy", e.Bin)
	}
	command := func() *exec.Cmd {
		cmd := exec.Command(e.Bin, "serve") //nolint:noctx,gosec // lives as long as the server; stopped by its own signal
		cmd.Dir = dir
		cmd.Env = append(os.Environ(), EngineEnv(e)...)
		cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
		return cmd
	}
	go func() {
		failures := 0
		for ctx.Err() == nil {
			cmd := command()
			started := time.Now()
			if err := cmd.Start(); err == nil {
				done := make(chan struct{})
				go func() {
					if err := cmd.Wait(); err != nil {
						slog.Warn("content engine: exited", "error", err.Error())
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
			slog.Warn("content engine: stopped; starting again", "inSeconds", RestartDelay(failures).Seconds())
			select {
			case <-ctx.Done():
				return
			case <-time.After(RestartDelay(failures)):
			}
		}
	}()
	return nil
}

// editorProxy passes a request to the engine and its answer back, streamed both ways, with the
// engine's key when the server started it (key), and never a key the browser sent.
func editorProxy(base, key string) http.Handler {
	target, _ := url.Parse(base)
	// The engine sees the request as the browser sent it: its own Host, the edge's forwarded
	// headers, which it uses for the addresses it writes, and the edge's identity headers.
	p := &httputil.ReverseProxy{Rewrite: func(pr *httputil.ProxyRequest) {
		pr.SetURL(target)
		pr.Out.Host = pr.In.Host
		for _, h := range []string{"X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto"} {
			if v := pr.In.Header.Values(h); len(v) > 0 {
				pr.Out.Header[h] = v
			}
		}
		pr.Out.Header.Del(contentKeyHeader)
		if key != "" {
			pr.Out.Header.Set(contentKeyHeader, key)
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
