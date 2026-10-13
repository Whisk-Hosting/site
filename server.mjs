// The website's server: one Node process with no framework (node:http), in front of everything the
// site is. In order, a request is:
// - /health/ready, the platform's health check: the database and the editor answer;
// - a form post to /forms/<name>, kept in the form_entries table;
// - /app, the admin, which is the editor, for the business's team (Whisk's sign-in), and
//   /cms/edit?path=, the editor opened at the page with that path (the Whisk bar's Edit page);
// - /cms and /_next, the editor (Payload, cms/) and its files, which this server starts beside it
//   (server/cms.mjs): its pages for the team, its API for anyone, deciding itself what each may do;
// - an old address of a moved website (redirects.json), in one hop;
// - a built file (storefront/dist/client), in the smallest form the browser takes;
// - otherwise a page, drawn by Astro (storefront/) from the editor's content.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { CMS_PORT, cmsAddress, cmsReady, proxy, startCms, stopCms } from "./server/cms.mjs"
import { anyFilled, CMS, editorFor, editPath, errorBody, formFields, formName, formReturn, isAdmin, isEditLink, isEditorPage, isStaff, pageQuery, redirectFor, signIn, sitemapFor, staticFile, variant } from "./server/routes.mjs"

const here = import.meta.dirname
const port = Number(process.env.PORT ?? 8080)
const develop = process.argv.includes("--develop")
const clientRoot = path.join(here, "storefront", "dist", "client")
const name = process.env.WHISK_APP_NAME || "Website"

const readList = (file) => {
  try {
    const list = JSON.parse(readFileSync(path.join(here, file), "utf8"))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
// A moved website's old addresses and its other sitemap addresses (MOVER.md §5.5).
const redirects = readList("redirects.json")
const sitemaps = readList("sitemaps.json").filter((p) => typeof p === "string")

let sql
const db = async () => {
  if (!process.env.DATABASE_URL) return undefined
  sql ??= (await import("postgres")).default(process.env.DATABASE_URL, { max: 3, connect_timeout: 5, idle_timeout: 30 })
  return sql
}

let astro
const pages = () => (astro ??= import(pathToFileURL(path.join(here, "storefront", "dist", "server", "entry.mjs")).href))

// Every call to the database has a deadline (docs/standards/RESILIENCE.md).
const within = (ms, work) =>
  Promise.race([work, new Promise((_, fail) => setTimeout(() => fail(new Error(`no answer in ${ms} ms`)), ms).unref())])

const json = (res, status, body, headers = {}) => res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers }).end(body)

const ready = async (res) => {
  const checks = await Promise.allSettled([
    db().then(async (s) => {
      if (!s) throw new Error("DATABASE_URL is not set")
      await within(5_000, s`select 1`)
    }),
    cmsReady(5_000),
  ])
  const failed = checks.map((c, i) => (c.status === "rejected" ? `${["database", "cms"][i]}: ${c.reason?.message ?? c.reason}` : null)).filter(Boolean)
  if (failed.length) return json(res, 503, errorBody("NOT_READY", `Not ready: ${failed.join("; ")}.`, "Wait for the database and the editor to start."), { "retry-after": "5" })
  json(res, 200, JSON.stringify({ ok: true }))
}

// The body of a form post, up to 64 KB, read within ten seconds; null when it is larger.
const readBody = (req, limit = 64 * 1024) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    const timer = setTimeout(() => reject(new Error("the form took too long to arrive")), 10_000)
    req.on("data", (c) => {
      size += c.length
      if (size > limit) {
        clearTimeout(timer)
        resolve(null)
        req.resume()
      } else chunks.push(c)
    })
    req.on("end", () => {
      clearTimeout(timer)
      resolve(Buffer.concat(chunks).toString("utf8"))
    })
    req.on("error", (e) => {
      clearTimeout(timer)
      reject(e)
    })
  })

// A form's entry, kept in the form_entries table (migrate.mjs), then back to the page it came
// from. The edge's challenge (whisk.yaml) keeps robots out.
const formPost = async (req, res, form) => {
  const body = await readBody(req)
  if (body === null) return json(res, 413, errorBody("BODY_TOO_LARGE", "The form was too large.", "Send less than 64 KB; attach large files by email instead."))
  const fields = formFields(req.headers["content-type"] ?? "", body)
  if (!fields) return json(res, 400, errorBody("INVALID_REQUEST", "The form could not be read.", "Post the form's fields as a form or as a JSON object."))
  if (!anyFilled(fields)) return json(res, 400, errorBody("INVALID_REQUEST", "The form was empty.", "Fill in at least one field."))
  const store = await db()
  if (!store) return json(res, 503, errorBody("NOT_READY", "Forms are not connected to a database here.", "Set DATABASE_URL."))
  const referer = typeof req.headers.referer === "string" ? req.headers.referer : undefined
  await within(5_000, store`insert into form_entries (form, page, data) values (${form}, ${referer ?? null}, ${store.json(fields)})`)
  res.writeHead(303, { location: formReturn(referer, form) }).end()
}

// The page, published or draft, that a path shows, asked of the editor's API as the person here
// (it shows drafts to the team only, cms/src/access.ts); null when none has it or the editor
// cannot answer, so the editor opens at its list of pages instead.
const IDENTITY = ["x-whisk-user-id", "x-whisk-email", "x-whisk-name", "x-whisk-audience", "x-whisk-roles"]
const findPage = async (req, path) => {
  const headers = Object.fromEntries(IDENTITY.filter((h) => typeof req.headers[h] === "string").map((h) => [h, req.headers[h]]))
  try {
    const res = await fetch(`${cmsAddress()}/cms/api/pages?${pageQuery(path)}`, { headers: { accept: "application/json", ...headers }, signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return null
    return (await res.json())?.docs?.[0] ?? null
  } catch {
    return null
  }
}

const exists = (f) => {
  try {
    return statSync(f).isFile()
  } catch {
    return false
  }
}

// A built file, if the path names one; false when it does not.
const sendStatic = (req, res, pathname) => {
  if (req.method !== "GET" && req.method !== "HEAD") return false
  const found = staticFile(clientRoot, pathname)
  if (!found || !exists(found.file)) return false
  const v = variant(found.file, found.ext, req.headers, exists)
  res.writeHead(200, {
    "content-type": v.type ?? found.type,
    "content-length": String(statSync(v.file).size),
    "cache-control": found.cache,
    ...(v.encoding ? { "content-encoding": v.encoding } : {}),
    ...(v.vary ? { vary: v.vary } : {}),
  })
  if (req.method === "HEAD") res.end()
  else createReadStream(v.file).pipe(res)
  return true
}

const handle = async (req, res) => {
  const url = req.url ?? "/"
  const pathname = url.split("?")[0]
  const search = url.includes("?") ? url.slice(url.indexOf("?")) : ""
  if (pathname === "/health/ready" || pathname === "/health") return ready(res)
  const form = formName(pathname)
  if (form && req.method === "POST") return formPost(req, res, form)
  if (isAdmin(pathname)) return res.writeHead(302, { location: isStaff(req.headers) ? "/cms" : signIn("/cms"), "cache-control": "no-store" }).end()
  if (isEditLink(pathname)) {
    if (!isStaff(req.headers)) return res.writeHead(302, { location: signIn(url), "cache-control": "no-store" }).end()
    return res.writeHead(302, { location: editorFor(await findPage(req, editPath(search))), "cache-control": "no-store" }).end()
  }
  if (CMS.test(pathname)) {
    if (isEditorPage(pathname) && !isStaff(req.headers)) return res.writeHead(302, { location: signIn(url), "cache-control": "no-store" }).end()
    return proxy(req, res, url)
  }
  if (req.method === "GET" || req.method === "HEAD") {
    const moved = redirectFor(redirects, pathname, search)
    if (moved) {
      res.writeHead(moved.status, { "cache-control": "public, max-age=300", ...(moved.location ? { location: moved.location } : { "content-type": "text/plain; charset=utf-8" }) })
      return res.end(moved.location ? undefined : "This page has been removed.")
    }
    if (sendStatic(req, res, pathname)) return
    const map = sitemapFor(sitemaps, pathname)
    if (map) req.url = map + search
  }
  const { handler } = await pages()
  // Pages are drawn fresh for the team, who may be previewing; the edge keeps everyone else's a
  // few minutes.
  res.setHeader("cache-control", isStaff(req.headers) ? "private, no-store" : "public, max-age=300")
  return handler(req, res, (e) => {
    if (e) throw e
    if (!res.headersSent) res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found")
  }, { site: { name, cms: cmsAddress() } })
}

startCms(path.join(here, "cms"), { develop })

const server = createServer((req, res) =>
  handle(req, res).catch((e) => {
    console.error(JSON.stringify({ level: "error", msg: "request failed", path: (req.url ?? "").split("?")[0], error: String(e?.stack ?? e) }))
    if (!res.headersSent) json(res, 500, errorBody("INTERNAL", "Something went wrong.", "Try again in a moment."))
    else res.destroy()
  }),
)
server.requestTimeout = 150_000
server.listen(port, () => console.log(JSON.stringify({ level: "info", msg: "listening", port, cmsPort: CMS_PORT })))

const stop = () => {
  stopCms()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 10_000).unref()
}
process.once("SIGTERM", stop)
process.once("SIGINT", stop)
if (!existsSync(path.join(here, "storefront", "dist", "server", "entry.mjs"))) console.error(JSON.stringify({ level: "error", msg: "the pages are not built: run npm run build" }))
