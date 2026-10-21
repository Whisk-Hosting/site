# The website's server, its built pages and the editor (cms/) beside them, in one image.

# The editor, a Next.js app that takes minutes to build, in a stage that reads only cms/: a change
# to the pages or the server leaves it as it was, and the builder reuses it.
FROM node:24-trixie-slim AS cms
WORKDIR /app/cms
COPY cms/package.json cms/package-lock.json ./
# npm's cache persists between builds, so unchanged dependencies are not downloaded again.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY cms/ ./
# Next.js's own cache persists too, so a change to the editor rebuilds only what it touches.
RUN --mount=type=cache,target=/app/cms/.next/cache npm run build
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev --no-audit --no-fund

FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# The pages, then their fonts, pictures and text made small; the small forms made by earlier
# builds are kept, so only what changed is encoded again.
RUN --mount=type=cache,target=/app/.cache/optimise node scripts/site.mjs pages
# Only what the server runs with, gathered in /out.
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev --no-audit --no-fund
RUN mkdir -p /out/storefront && cp -r package.json server.mjs migrate.mjs server node_modules /out/ && cp -r storefront/dist /out/storefront/ \
 && for f in redirects.json sitemaps.json robots.txt; do if [ -e "$f" ]; then cp "$f" /out/; fi; done

# The site runs on Google's distroless Node image: Node and the system libraries it needs, with
# no shell, package manager or other tools.
FROM gcr.io/distroless/nodejs24-debian13:nonroot
# The image starts node itself; on the PATH it also runs the migrate command from whisk.yaml.
ENV PATH=/nodejs/bin:/usr/local/bin:/usr/bin:/bin
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
COPY --from=cms /app/cms ./cms
USER nonroot
EXPOSE 8080
CMD ["server.mjs"]
