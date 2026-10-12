// GET /robots.txt: a moved website's own (robots.txt beside the app, kept by the mover), or one
// that keeps crawlers out of the admin and names the sitemap.
import type { APIRoute } from "astro"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { robotsTxt } from "../lib/format"

export const GET: APIRoute = async ({ url }) => {
  const site = await readFile(path.resolve(process.cwd(), "robots.txt"), "utf8").catch(() => undefined)
  return new Response(robotsTxt(url.origin, site), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } })
}
