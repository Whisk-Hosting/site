// The editor (Payload, cms/) runs beside the website's server in the same app: the server starts
// it on a port of this machine's own, keeps it running, and passes /cms (the editor and its API)
// and /_next (the editor's own files) to it. The pages read from it there too
// (storefront/src/lib/cms.ts). Nothing outside the app reaches that port.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import http from "node:http"
import path from "node:path"

export const CMS_PORT = Number(process.env.CMS_PORT ?? 9100)
export const cmsAddress = () => `http://127.0.0.1:${CMS_PORT}`

// How long to wait before starting the editor again after it stops: a second, doubling to a
// minute, so an editor that cannot start does not spin.
export const restartDelay = (failures) => Math.min(60_000, 1_000 * 2 ** Math.max(0, failures - 1))

// The headers passed to the editor: the request's own, less the connection's.
const HOP = new Set(["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "te", "trailer"])
export const forwardHeaders = (h) => Object.fromEntries(Object.entries(h).filter(([k, v]) => v !== undefined && !HOP.has(k.toLowerCase())))

let child
let failures = 0
let stopping = false

// startCms starts the editor once per server, and again whenever it stops. `develop` runs it with
// Next's development server, which rebuilds as its files change.
export const startCms = (dir, { develop = false, log = (l) => console.log(l) } = {}) => {
  if (child || stopping) return
  const next = path.join(dir, "node_modules", "next", "dist", "bin", "next")
  if (!existsSync(next)) return log(JSON.stringify({ level: "error", msg: "cms: no built editor, so /cms is not served", dir }))
  const started = Date.now()
  child = spawn(process.execPath, [next, develop ? "dev" : "start", "-p", String(CMS_PORT), "-H", "127.0.0.1"], {
    cwd: dir,
    env: { ...process.env, PORT: String(CMS_PORT), NODE_ENV: develop ? "development" : "production", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "inherit", "inherit"],
  })
  child.on("exit", (code, signal) => {
    child = undefined
    if (stopping) return
    failures = Date.now() - started > 120_000 ? 1 : failures + 1
    log(JSON.stringify({ level: "warn", msg: "cms: stopped; starting again", code: signal ?? code, inSeconds: restartDelay(failures) / 1000 }))
    setTimeout(() => startCms(dir, { develop, log }), restartDelay(failures)).unref()
  })
}

export const stopCms = () => {
  stopping = true
  child?.kill("SIGTERM")
}

// cmsReady says whether the editor answers, within the time given.
export const cmsReady = (ms = 5_000) =>
  new Promise((ok, fail) => {
    const req = http.get(`${cmsAddress()}/cms/api/globals/menus?depth=0`, { timeout: ms }, (res) => {
      res.resume()
      if (res.statusCode === 200) ok()
      else fail(new Error(`answered ${res.statusCode}`))
    })
    req.on("timeout", () => req.destroy(new Error(`no answer in ${ms} ms`)))
    req.on("error", fail)
  })

// proxy passes one request to the editor and its answer back, streamed both ways. A request that
// waits more than two minutes (a large upload) is cut off.
export const proxy = (req, res, url) =>
  new Promise((done) => {
    const out = http.request(`${cmsAddress()}${url}`, { method: req.method, headers: forwardHeaders(req.headers), timeout: 120_000 }, (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers)
      answer.pipe(res)
      answer.on("end", done)
      answer.on("error", () => done())
    })
    out.on("timeout", () => out.destroy(new Error("the editor took too long")))
    out.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(503, { "content-type": "application/json", "retry-after": "5" })
        res.end(JSON.stringify({ error: { code: "CMS_UNAVAILABLE", message: "The site editor is starting.", fix: "Try again in a few seconds.", docs: "https://skill.whisk.run/errors/CMS_UNAVAILABLE" } }))
      } else res.destroy()
      done()
    })
    req.pipe(out)
  })
