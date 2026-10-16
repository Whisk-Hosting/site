// The website's server decisions (server/routes.mjs) and the pages' helpers (storefront/src/lib/format.ts).
import { test } from "node:test"
import assert from "node:assert/strict"
import { accepts, anyFilled, CMS, editorFor, editPath, formFields, formName, formReturn, isAdmin, isEditLink, isEditorPage, isStaff, pageQuery, redirectFor, signIn, sitemapFor, staticFile, variant } from "../server/routes.mjs"
import { forwardHeaders, restartDelay } from "../server/cms.mjs"
import { picture, robotsTxt, sitemap } from "../storefront/src/lib/format"
import { encodedForm } from "../storefront/src/lib/cms"

const team = { "x-whisk-user-id": "u1", "x-whisk-email": "jane@example.com", "x-whisk-audience": "team", "x-whisk-roles": "owner" }

test("the editor answers /cms and /_next, its pages for the team and its API for anyone", () => {
  for (const p of ["/cms", "/cms/collections/pages", "/cms/api/pages", "/_next/static/a.js"]) assert.equal(CMS.test(p), true, p)
  for (const p of ["/cmsx", "/about/cms", "/", "/_nextx"]) assert.equal(CMS.test(p), false, p)
  for (const p of ["/cms", "/cms/", "/cms/collections/pages", "/cms/apis"]) assert.equal(isEditorPage(p), true, p)
  for (const p of ["/cms/api", "/cms/api/pages", "/_next/static/a.js"]) assert.equal(isEditorPage(p), false, p)
  assert.equal(isAdmin("/app"), true)
  assert.equal(isAdmin("/app/pages"), true)
  assert.equal(isAdmin("/apple"), false)
})

test("the business's team, but for a guest, may edit the site", () => {
  assert.equal(isStaff(team), true)
  assert.equal(isStaff({ ...team, "x-whisk-roles": "guest" }), false)
  assert.equal(isStaff({ ...team, "x-whisk-roles": "guest, member" }), true)
  assert.equal(isStaff({ ...team, "x-whisk-audience": "customer" }), false)
  assert.equal(isStaff({ ...team, "x-whisk-email": "" }), false)
  assert.equal(isStaff({}), false)
  assert.equal(signIn("/cms/collections/pages?x=1"), "/.whisk/login?return=%2Fcms%2Fcollections%2Fpages%3Fx%3D1")
})

test("built files are served from their folder only, cached by kind", () => {
  assert.deepEqual(staticFile("/srv/c/", "/_astro/a.1b2c.css"), { file: "/srv/c/_astro/a.1b2c.css", ext: ".css", type: "text/css; charset=utf-8", cache: "public, max-age=31536000, immutable" })
  assert.equal(staticFile("/srv/c", "/fonts/A%20B.woff2")?.file, "/srv/c/fonts/A B.woff2")
  assert.equal(staticFile("/srv/c", "/files/brochure.pdf")?.cache, "public, max-age=3600")
  for (const p of ["/about/", "/a/../../etc/passwd.css", "/.env.json", "/%2e%2e/x.css", "/x.php", "/%E0%A4%A.css"]) assert.equal(staticFile("/srv/c", p), null, p)
})

test("the smallest form of a file the browser takes", () => {
  const has = (...files: string[]) => (f: string) => files.includes(f)
  assert.deepEqual(variant("/a.png", ".png", { accept: "image/avif,image/webp,*/*" }, has("/a.png.webp")), { file: "/a.png.webp", type: "image/webp", vary: "Accept" })
  assert.deepEqual(variant("/a.png", ".png", { accept: "image/png" }, has("/a.png.webp")), { file: "/a.png", vary: "Accept" })
  assert.deepEqual(variant("/a.jpg", ".jpg", { accept: "image/webp" }, has()), { file: "/a.jpg" })
  assert.deepEqual(variant("/a.css", ".css", { "accept-encoding": "gzip, br" }, has("/a.css.br", "/a.css.gz")), { file: "/a.css.br", encoding: "br", vary: "Accept-Encoding" })
  assert.deepEqual(variant("/a.css", ".css", { "accept-encoding": "br;q=0, gzip" }, has("/a.css.br", "/a.css.gz")), { file: "/a.css.gz", encoding: "gzip", vary: "Accept-Encoding" })
  assert.deepEqual(variant("/a.css", ".css", {}, has("/a.css.br")), { file: "/a.css", vary: "Accept-Encoding" })
  assert.equal(accepts(undefined, "br"), false)
})

test("old addresses answer in one hop, and other sitemap addresses as /sitemap.xml", () => {
  const list = [{ from: "/old", to: "/new/" }, { from: "/old?p=2", to: "/new/2/" }, { from: "/gone", status: 410 }, { from: "/temp", to: "/t", status: 302 }, { from: "/broken" }]
  assert.deepEqual(redirectFor(list, "/old", ""), { status: 301, location: "/new/" })
  assert.deepEqual(redirectFor(list, "/old", "?p=2"), { status: 301, location: "/new/2/" })
  assert.deepEqual(redirectFor(list, "/old", "?p=3"), { status: 301, location: "/new/" })
  assert.deepEqual(redirectFor(list, "/gone", ""), { status: 410 })
  assert.deepEqual(redirectFor(list, "/temp", ""), { status: 302, location: "/t" })
  assert.equal(redirectFor(list, "/broken", ""), null)
  assert.equal(redirectFor(list, "/new/", ""), null)
  assert.equal(sitemapFor(["/sitemap_index.xml"], "/sitemap_index.xml"), "/sitemap.xml")
  assert.equal(sitemapFor([], "/sitemap.xml"), "/sitemap.xml")
  assert.equal(sitemapFor([], "/page-sitemap.xml"), null)
})

test("form posts are read, refused when empty, and return to their page", () => {
  assert.equal(formName("/forms/contact"), "contact")
  assert.equal(formName("/forms/Contact"), null)
  assert.equal(formName("/forms/a/b"), null)
  assert.deepEqual(formFields("application/x-www-form-urlencoded", "name=Mia&email=a%40b.com"), { name: "Mia", email: "a@b.com" })
  assert.deepEqual(formFields("application/json", '{"a":1}'), { a: 1 })
  assert.equal(formFields("application/json", "[1]"), null)
  assert.equal(formFields("application/json", "{"), null)
  assert.equal(anyFilled({ a: " ", b: "" }), false)
  assert.equal(anyFilled({ a: "x" }), true)
  assert.equal(formReturn("https://example.com/contact/?x=1", "contact"), "/contact/?x=1&sent=contact")
  assert.equal(formReturn(undefined, "contact"), "/?sent=contact")
  assert.equal(formReturn("https://evil.example//x", "c"), "/?sent=c")
})

test("the editor is started again after a pause that doubles to a minute, with the request's own headers", () => {
  assert.deepEqual([1, 2, 3, 7, 8, 20].map(restartDelay), [1000, 2000, 4000, 60000, 60000, 60000])
  assert.deepEqual(forwardHeaders({ host: "a", connection: "keep-alive", "x-whisk-user-id": "u1", te: "trailers", accept: undefined }), { host: "a", "x-whisk-user-id": "u1" })
})

test("pictures, the sitemap and robots.txt", () => {
  assert.equal(picture(null, 400), null)
  assert.deepEqual(picture("https://cdn.example/a.jpg", 400), { src: "https://cdn.example/a.jpg" })
  assert.deepEqual(picture("/.whisk/img/7?x=1", 400), { src: "/.whisk/img/7?w=400&format=auto", srcset: "/.whisk/img/7?w=400&format=auto 1x, /.whisk/img/7?w=800&format=auto 2x" })
  assert.equal(sitemap("https://example.com", [{ path: "/a&b/", updated: "2026-10-10T00:00:00Z" }]).includes("<loc>https://example.com/a&amp;b/</loc><lastmod>2026-10-10T00:00:00.000Z</lastmod>"), true)
  assert.equal(robotsTxt("https://example.com", "User-agent: *\nDisallow:\n"), "User-agent: *\nDisallow:\n")
  assert.equal(robotsTxt("https://example.com", undefined), "User-agent: *\nDisallow: /app\nDisallow: /cms\n\nSitemap: https://example.com/sitemap.xml\n")
})

test("the Whisk bar's Edit page opens the editor at the page with that path", () => {
  assert.equal(isEditLink("/cms/edit"), true)
  assert.equal(isEditLink("/cms/editx"), false)
  const asked: [string, string][] = [
    ["?path=%2Fabout%2F", "/about/"],
    ["?path=/services/repairs", "/services/repairs"],
    ["", "/"],
    ["?path=about", "/"],
    ["?path=%2F%2Fevil.example", "/"],
    ["?path=%2Fa%23b", "/"],
  ]
  for (const [search, want] of asked) assert.equal(editPath(search), want, search)

  const paths = (q: URLSearchParams) => [...q.entries()].filter(([k]) => k.startsWith("where")).map(([, v]) => v)
  assert.deepEqual(paths(pageQuery("/")), ["/"])
  assert.deepEqual(paths(pageQuery("/about/")), ["/about/", "/about"])
  assert.deepEqual(paths(pageQuery("/caf%C3%A9")), ["/caf%C3%A9", "/caf%C3%A9/", "/café", "/café/"])
  assert.deepEqual(paths(pageQuery("/100%")), ["/100%", "/100%/"])
  assert.equal(pageQuery("/").get("draft"), "true")

  assert.equal(editorFor({ id: 7 }), "/cms/collections/pages/7")
  assert.equal(editorFor(null), "/cms/collections/pages")
  assert.equal(editorFor({}), "/cms/collections/pages")
})

test("a page whose old address was percent-encoded is found by its encoded form", () => {
  assert.equal(encodedForm("/🍺-tips/"), "/%F0%9F%8D%BA-tips/")
  assert.equal(encodedForm("/māori/"), "/m%C4%81ori/")
  assert.equal(encodedForm("/about/"), null)
  assert.equal(encodedForm("/"), null)
})
