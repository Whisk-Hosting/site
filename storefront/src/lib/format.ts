// Pure helpers for what pages write: picture sizes, the sitemap and robots.txt. Table-tested.

// A picture from the CMS at the width the layout shows it, and twice that for sharp screens. The
// platform's pictures (/.whisk/img/<id>) are resized by the edge; any other address is used as it is.
export const picture = (url: string | null | undefined, width: number): { src: string; srcset?: string } | null => {
  if (!url) return null
  if (!url.includes("/.whisk/img/")) return { src: url }
  const base = url.split("?")[0]
  return { src: `${base}?w=${width}&format=auto`, srcset: `${base}?w=${width}&format=auto 1x, ${base}?w=${width * 2}&format=auto 2x` }
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export const sitemap = (origin: string, entries: { path: string; updated?: string | null }[]) =>
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map((e) => `<url><loc>${xml(origin + e.path)}</loc>${e.updated ? `<lastmod>${xml(new Date(e.updated).toISOString())}</lastmod>` : ""}</url>`),
    `</urlset>`,
    "",
  ].join("\n")

// robots.txt: a moved website's own as it was (robots.txt beside the app, kept by the mover), or
// one that keeps crawlers out of the admin and names the sitemap.
export const robotsTxt = (origin: string, siteRobots: string | undefined): string =>
  siteRobots?.trim() ? siteRobots : ["User-agent: *", "Disallow: /app", "Disallow: /cms", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n")
