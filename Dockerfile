# The website's server (Go), its theme, files and starting content, and Whisk's content engine
# beside them, in one image.

# Whisk's content engine: empty here. Whisk fills this stage with the engine for every site's
# build; a site its node's engine does not answer (a preview) starts it beside its pages
# (editor.go).
FROM scratch AS whisk-content-engine

# The server: one static Go program, which draws every page from theme/ with the engine's content.
FROM golang:1.27-alpine AS server
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY *.go ./
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server .

# The site's files, their fonts, pictures and text made small; the small forms made by earlier
# builds are kept, so only what changed is encoded again.
FROM node:24-trixie-slim AS files
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN --mount=type=cache,target=/app/.cache/optimise node scripts/site.mjs files
RUN mkdir -p /out && cp -r theme public /out/ \
 && for f in content redirects.json sitemaps.json robots.txt; do if [ -e "$f" ]; then cp -r "$f" /out/; fi; done

# Google's distroless static image: the server, the engine and the site's files, with no shell,
# Node or other tools. The server also runs the migrate command from whisk.yaml.
FROM gcr.io/distroless/static-debian13:nonroot
WORKDIR /app
COPY --from=files /out ./
COPY --from=server /out/server ./server
COPY --from=whisk-content-engine --chmod=755 / ./engine/
USER nonroot
EXPOSE 8080
# doctor: allow W140 W141 a small server that logs every error it meets as JSON
ENTRYPOINT ["/app/server"]
