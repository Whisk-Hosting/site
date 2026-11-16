# The website's server (Go), its theme and files, and the editor (cms/) beside them, in one image.

# The editor, a Next.js app that takes minutes to build, in a stage that reads only cms/: a change
# to the theme or the server leaves it as it was, and the builder reuses it.
FROM node:24-trixie-slim AS cms
WORKDIR /app/cms
COPY cms/package.json cms/package-lock.json ./
# npm's cache persists between builds, so unchanged dependencies are not downloaded again.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY cms/ ./
# Next.js's own cache persists too, so a change to the editor rebuilds only what it touches.
RUN --mount=type=cache,target=/app/cms/.next/cache npm run build
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev --no-audit --no-fund

# The server: one static Go program, which draws every page from theme/ with the editor's content.
FROM golang:1.27-alpine AS server
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY *.go ./
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server .

# The site's files, their fonts, pictures and text made small; the small forms made by earlier
# builds are kept, so only what changed is encoded again. Then only what the migrate step needs.
FROM node:24-trixie-slim AS files
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN --mount=type=cache,target=/app/.cache/optimise node scripts/site.mjs files
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev --no-audit --no-fund
RUN mkdir -p /out && cp -r package.json migrate.mjs node_modules theme public /out/ \
 && for f in redirects.json sitemaps.json robots.txt; do if [ -e "$f" ]; then cp "$f" /out/; fi; done

# Google's distroless Node image: Node for the editor and the migrate step, with no shell, package
# manager or other tools. The server itself needs none of it.
FROM gcr.io/distroless/nodejs24-debian13:nonroot
# On the PATH, node runs the editor and the migrate command from whisk.yaml.
ENV PATH=/nodejs/bin:/usr/local/bin:/usr/bin:/bin
ENV NODE_ENV=production
WORKDIR /app
COPY --from=files /out ./
COPY --from=server /out/server ./server
COPY --from=cms /app/cms ./cms
USER nonroot
EXPOSE 8080
# The Sentry and OpenTelemetry SDKs add about 100 MB to the editor's process, and this app already
# needs most of its memory for the editor.
# doctor: allow W140 W141 too big for the SDKs
ENTRYPOINT ["/app/server"]
