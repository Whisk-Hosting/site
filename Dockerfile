# The website's server, its built pages and the editor (cms/) beside them, in one image.
FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm's cache persists between builds, so unchanged dependencies are not downloaded again.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY cms/package.json cms/package-lock.json ./cms/
RUN --mount=type=cache,target=/root/.npm cd cms && npm ci --no-audit --no-fund
COPY . .
RUN npm run build
# Only what the server and the editor run with, gathered in /out.
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev --no-audit --no-fund && cd cms && npm prune --omit=dev --no-audit --no-fund && rm -rf .next/cache
RUN mkdir -p /out/storefront && cp -r package.json server.mjs migrate.mjs server node_modules cms /out/ && cp -r storefront/dist /out/storefront/ \
 && for f in redirects.json sitemaps.json robots.txt; do if [ -e "$f" ]; then cp "$f" /out/; fi; done

# The site runs on Google's distroless Node image: Node and the system libraries it needs, with
# no shell, package manager or other tools.
FROM gcr.io/distroless/nodejs24-debian13:nonroot
# The image starts node itself; on the PATH it also runs the migrate command from whisk.yaml.
ENV PATH=/nodejs/bin:/usr/local/bin:/usr/bin:/bin
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
USER nonroot
EXPOSE 8080
CMD ["server.mjs"]
