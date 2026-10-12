// The website: server-rendered pages drawn from the CMS (cms/), which the app's server
// (server.mjs) hands every address that is not its own.
import { defineConfig } from "astro/config"
import node from "@astrojs/node"

export default defineConfig({
  output: "server",
  adapter: node({ mode: "middleware" }),
  // Forms post to the same address; the edge already refuses cross-site posts (CADDY.md §5.1).
  // Only Whisk's edge reaches the app, and only for the app's own names, so the address the
  // browser used (Host, X-Forwarded-Proto) is trusted: sitemaps and robots.txt name it, not the
  // server's own port.
  security: { checkOrigin: false, allowedDomains: [{}] },
  build: { inlineStylesheets: "always" },
  compressHTML: true,
})
