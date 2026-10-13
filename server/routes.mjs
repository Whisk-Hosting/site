// What the website's server (server.mjs) decides about each request. Pure; table-tested
// (test/routes.test.ts).

// The editor (Payload, cms/) answers /cms and its own files under /_next. /app is the admin's
// address, as in a shop, and opens the editor. Everything else is the site's pages (Astro).
export const CMS = /^\/(cms|_next)(\/.*)?$/
export const isAdmin = (path) => /^\/app(\/|$)/.test(path)

// The editor's pages are for the business's team; its API answers anyone, and decides itself what
// each may read (published pages) or change (the team, cms/src/access.ts).
export const isEditorPage = (path) => /^\/cms(\/|$)/.test(path) && !/^\/cms\/api(\/|$)/.test(path)

// Who is here, as Whisk's edge says (CONTRACT.md §4): it sets these headers on every request and
// strips any a browser sends. The team, but for a guest, may edit the site.
export const isStaff = (h) => {
  const roles = String(h["x-whisk-roles"] ?? "").split(",").map((r) => r.trim()).filter(Boolean)
  return h["x-whisk-audience"] === "team" && !!h["x-whisk-user-id"] && !!h["x-whisk-email"] && roles.some((r) => r !== "guest")
}

// Where someone who is not signed in to the team goes for an editor page: Whisk's sign-in, then back.
export const signIn = (url) => `/.whisk/login?return=${encodeURIComponent(url)}`

// The built files (storefront/dist/client): scripts and styles under /_astro, whose names carry a
// hash and so never change, and the public folder's files (the favicon, and a moved website's
// fonts, documents and the files its old addresses named).
const TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".html": "text/html; charset=utf-8",
}

// staticFile is the file under root that a path names, with its type and how long it may be
// cached, or null: for a path that is not a plain file name, escapes root, or has a type the site
// does not serve.
export const staticFile = (root, urlPath) => {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (!decoded.startsWith("/") || decoded.includes("\0") || decoded.split("/").some((part) => part === ".." || part.startsWith("."))) return null
  const ext = /\.[a-z0-9]+$/i.exec(decoded)?.[0].toLowerCase()
  const type = ext ? TYPES[ext] : undefined
  if (!type) return null
  const cache = decoded.startsWith("/_astro/") ? "public, max-age=31536000, immutable" : "public, max-age=3600"
  return { file: root.replace(/\/$/, "") + decoded, ext, type, cache }
}

// Whether a comma-separated Accept-style header names a token with a q above zero.
export const accepts = (header, token) =>
  String(header ?? "")
    .split(",")
    .some((part) => {
      const [name, ...params] = part.trim().toLowerCase().split(";")
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="))
      return name.trim() === token && (q === undefined || Number(q.slice(2)) > 0)
    })

// The smallest form of a file this browser takes, from what scripts/optimise.mjs wrote beside it
// (`has` says which exist): a WebP for a PNG or JPEG, then Brotli or gzip for text. Addresses
// never change, so the answer says what it varies by.
export const variant = (file, ext, headers, has) => {
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    if (!has(`${file}.webp`)) return { file }
    return accepts(headers.accept, "image/webp") ? { file: `${file}.webp`, type: "image/webp", vary: "Accept" } : { file, vary: "Accept" }
  }
  for (const [encoding, suffix] of [["br", ".br"], ["gzip", ".gz"]]) {
    if (accepts(headers["accept-encoding"], encoding) && has(file + suffix)) return { file: file + suffix, encoding, vary: "Accept-Encoding" }
  }
  return has(`${file}.br`) || has(`${file}.gz`) ? { file, vary: "Accept-Encoding" } : { file }
}

// A moved website's old addresses (redirects.json, written by the mover): each answers with one
// hop to where it went, or 410 for a page that is gone. A redirect for an exact query wins over
// one for the path alone.
export const redirectFor = (redirects, path, search) => {
  const hit = redirects.find((r) => search && r.from === path + search) ?? redirects.find((r) => r.from === path)
  if (!hit) return null
  if (hit.status === 410) return { status: 410 }
  if (!hit.to) return null
  return { status: hit.status === 302 || hit.status === 307 || hit.status === 308 ? hit.status : 301, location: hit.to }
}

// A moved website's other sitemap addresses (sitemaps.json, such as /sitemap_index.xml) answer as
// /sitemap.xml does, so search engines find the same files at the same addresses.
export const sitemapFor = (aliases, path) => (path === "/sitemap.xml" || aliases.includes(path) ? "/sitemap.xml" : null)

// A form posts to /forms/<name>; the entry is kept in the app's database.
export const formName = (path) => /^\/forms\/([a-z0-9-]{1,40})$/.exec(path)?.[1] ?? null

// A form's fields from its body, or null when the body is not one; and whether any is filled
// (the form script first posts empty to fetch the edge's challenge, which must not become an
// entry).
export const formFields = (contentType, body) => {
  try {
    const fields = String(contentType).includes("application/json") ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body))
    return fields && typeof fields === "object" && !Array.isArray(fields) ? fields : null
  } catch {
    return null
  }
}
export const anyFilled = (fields) => Object.values(fields).some((v) => String(v ?? "").trim() !== "")

// Where a form post returns: the page it came from, told which form was sent.
export const formReturn = (referer, name) => {
  try {
    const u = new URL(referer ?? "/", "http://x")
    u.searchParams.set("sent", name)
    return u.pathname.startsWith("//") ? `/?sent=${encodeURIComponent(name)}` : u.pathname + u.search
  } catch {
    return `/?sent=${encodeURIComponent(name)}`
  }
}

// An error answered as the platform's errors are (contract/errors.md): a code, a sentence and a fix.
export const errorBody = (code, message, fix) => JSON.stringify({ error: { code, message, fix } })

// The page editor's address (whisk.yaml's admin.edit, CONTRACT.md §3.1): /cms/edit?path=<a
// page's path>, which the Whisk bar's Edit page links to. The editor is opened at the page that
// path shows, or at the list of pages when no page has it. These say which path was asked for
// (the site's home when it is not one), the editor's API query that finds its page, in either
// form of the address and as written or decoded, and where the editor opens for what it found.
export const isEditLink = (path) => path === "/cms/edit"
export const editPath = (search) => {
  const p = new URLSearchParams(search).get("path") ?? ""
  return p.startsWith("/") && !p.startsWith("//") && p.length <= 2000 && !/[\s#?\\]/.test(p) ? p : "/"
}
export const pageQuery = (path) => {
  const forms = (p) => (p === "/" ? [p] : [p, p.endsWith("/") ? p.slice(0, -1) : `${p}/`])
  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {
    // a path that is not valid percent-encoding is looked up only as written
  }
  const paths = [...new Set([...forms(path), ...forms(decoded)])]
  const q = new URLSearchParams({ depth: "0", limit: "1", draft: "true" })
  paths.forEach((p, i) => q.set(`where[or][${i}][path][equals]`, p))
  return q
}
export const editorFor = (found) => (found && found.id !== undefined && found.id !== null ? `/cms/collections/pages/${encodeURIComponent(String(found.id))}` : "/cms/collections/pages")
