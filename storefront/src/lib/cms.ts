// Reading the website's pages, product pages and menus from the CMS (Payload, cms/), which runs
// beside the app's server on this machine. Published content is kept for a few seconds,
// so a busy page asks once, and kept longer for when the CMS cannot answer, so pages heal rather
// than fail while it restarts. A preview (?preview=1, the team only) reads the draft every time.

export type Media = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null; mimeType?: string | null }
export type Link = { label?: string | null; url?: string | null }
export type Block = { blockType: string; id?: string } & Record<string, any>
export type Page = {
  id: number
  title: string
  searchTitle?: string | null
  path: string
  description?: string | null
  image?: Media | null
  noindex?: boolean | null
  head?: string | null
  layout?: Block[] | null
  market?: string | null // the one market's site the page is for; every site's when empty
  updatedAt?: string
}
// A page's whole <title>: the one it was given for search results, as a moved page had it, or its
// title and the site's name, or the site's name alone on the home page.
export const pageTitle = (p: { title?: string; searchTitle?: string | null; path?: string }, siteName: string) =>
  p.searchTitle?.trim() || (p.path === "/" || !p.title ? siteName : `${p.title} | ${siteName}`)

export type ProductPage = { handle: string; layout?: Block[] | null }
export type Menus = {
  name?: string | null
  header?: { label: string; url: string }[] | null
  columns?: { heading?: string | null; links?: { label: string; url: string }[] | null }[] | null
  note?: string | null
}

const FRESH = 15_000 // how long published content is used before asking again
const STALE = 24 * 3600_000 // how long it may stand in while the CMS cannot answer
const LIMIT = 500

type Kept = { value: unknown; at: number }
const kept = new Map<string, Kept>()

const keep = (key: string, value: unknown) => {
  kept.delete(key)
  kept.set(key, { value, at: Date.now() })
  if (kept.size > LIMIT) kept.delete(kept.keys().next().value as string)
}

// The headers that say who is asking, passed on for a preview so the CMS shows its draft only to
// the team (cms/src/access.ts).
const IDENTITY = ["x-whisk-user-id", "x-whisk-email", "x-whisk-name", "x-whisk-audience", "x-whisk-roles"]

// market: the market whose site is asked for, in a shop that sells in several (its own page at an
// address is shown instead of the one for every site); null otherwise.
export type Reader = { base: string; request: Request; preview: boolean; market: string | null }

// A preview is asked for with ?preview=1 and shown only to the business's team (as Whisk's edge
// says, cms/src/whisk.ts); anyone else gets the published page.
const onTeam = (h: Headers) => h.get("x-whisk-audience") === "team" && !!h.get("x-whisk-user-id") && (h.get("x-whisk-roles") ?? "").split(",").some((r) => r.trim() && r.trim() !== "guest")

export const reader = (base: string, request: Request, market: string | null = null): Reader => ({
  base,
  request,
  preview: new URL(request.url).searchParams.get("preview") === "1" && onTeam(request.headers),
  market,
})

// Of the pages at one address, the one a market's site shows: its own, else the one for every
// site; never another market's.
export const forSite = <T extends { market?: string | null }>(docs: readonly T[], market: string | null): T | null =>
  docs.find((d) => market && d.market === market) ?? docs.find((d) => !d.market) ?? null

const ask = async <T>(r: Reader, path: string, params: Record<string, string>): Promise<T> => {
  const q = new URLSearchParams({ ...params, ...(r.preview ? { draft: "true" } : {}) })
  const url = `${r.base}/cms/api/${path}?${q}`
  const cached = kept.get(url)
  if (!r.preview && cached && Date.now() - cached.at < FRESH) return cached.value as T
  const headers: Record<string, string> = { accept: "application/json" }
  if (r.preview) for (const h of IDENTITY) {
    const v = r.request.headers.get(h)
    if (v) headers[h] = v
  }
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5_000) })
    if (!res.ok) throw new Error(`the CMS answered ${res.status}`)
    const value = (await res.json()) as T
    if (!r.preview) keep(url, value)
    return value
  } catch (e) {
    if (!r.preview && cached && Date.now() - cached.at < STALE) return cached.value as T
    throw e
  }
}

type List<T> = { docs: T[]; hasNextPage: boolean }

export const page = async (r: Reader, path: string): Promise<Page | null> =>
  forSite((await ask<List<Page>>(r, "pages", { "where[path][equals]": path, depth: "2", limit: "10" })).docs, r.market)

export const productPage = async (r: Reader, handle: string): Promise<ProductPage | null> =>
  (await ask<List<ProductPage>>(r, "product-pages", { "where[handle][equals]": handle, depth: "2", limit: "1" })).docs[0] ?? null

// The menus, or none when the CMS cannot say: a page still draws without them.
export const menus = async (r: Reader): Promise<Menus> => ask<Menus>(r, "globals/menus", { depth: "0" }).catch(() => ({}))

// Every published page that search engines may list on this site, for the sitemap.
type Listed = { path: string; noindex?: boolean | null; market?: string | null; updatedAt?: string }
export const listedPages = async (r: Reader): Promise<Listed[]> => {
  const out: Listed[] = []
  for (let n = 1; n <= 50; n++) {
    const got = await ask<List<Listed>>(r, "pages", {
      "select[path]": "true",
      "select[noindex]": "true",
      "select[market]": "true",
      "select[updatedAt]": "true",
      depth: "0",
      limit: "200",
      page: String(n),
      sort: "path",
    })
    out.push(...got.docs)
    if (!got.hasNextPage) break
  }
  const paths = [...new Set(out.map((d) => d.path))]
  return paths.map((p) => forSite(out.filter((d) => d.path === p), r.market)).filter((d): d is Listed => !!d && !d.noindex)
}

// The other form of an address, with or without its last slash: a page is found at either, and
// the visitor sent to the one it was given.
export const otherForm = (path: string) => (path === "/" ? null : path.endsWith("/") ? path.slice(0, -1) : `${path}/`)

// The script a preview page carries: it tells the editor it is ready and reloads when the draft is
// saved, so the preview beside the editor follows the edit.
export const PREVIEW_SCRIPT = `(() => {
  const editor = window.parent !== window ? window.parent : window.opener
  if (!editor) return
  editor.postMessage({ type: "payload-live-preview", ready: true }, location.origin)
  addEventListener("message", (e) => {
    if (e.origin === location.origin && e.data && e.data.type === "payload-document-event") location.reload()
  })
})()`
