// GET /sitemap.xml: every published page search engines may list, from the CMS. A moved website's
// other sitemap addresses (sitemaps.json) answer the same (server.mjs).
import type { APIRoute } from "astro"
import { sitemap } from "../lib/format"
import { listedPages, reader } from "../lib/cms"

export const GET: APIRoute = async ({ request, locals, url }) => {
  const pages = await listedPages(reader(locals.site.cms, request))
  return new Response(sitemap(url.origin, pages.map((p) => ({ path: p.path, updated: p.updatedAt }))), {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  })
}
