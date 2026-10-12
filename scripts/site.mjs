// The website's build and laptop steps, in Node so they run the same in PowerShell, Command
// Prompt and a Unix shell.
//   node scripts/site.mjs build   the pages (Astro, storefront/), their files made small
//                                 (scripts/optimise.mjs), and the editor (cms/)
//   node scripts/site.mjs dev     the pages built once, then the server with the editor rebuilding
//                                 as its files change
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const require = createRequire(path.join(root, "package.json"))
// Each tool's own command, run with this Node.
const bin = (pkg) => {
  const manifest = require.resolve(`${pkg}/package.json`)
  const { bin } = require(manifest)
  return path.join(path.dirname(manifest), typeof bin === "string" ? bin : Object.values(bin)[0])
}

const run = (args, cwd = root) => {
  const r = spawnSync(process.execPath, args, { cwd, stdio: "inherit" })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

// The editor (cms/): Payload, a Next.js app with its own packages, built in its folder.
const cms = path.join(root, "cms")
const npm = (args, cwd = cms) => {
  const r = spawnSync("npm", args, { cwd, stdio: "inherit", shell: process.platform === "win32" })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
const installCms = () => {
  if (!existsSync(path.join(cms, "node_modules", "next"))) npm(["ci", "--no-audit", "--no-fund"])
}

const buildPages = () => {
  run([bin("astro"), "build", "--root", "storefront"])
  run([path.join(root, "scripts", "optimise.mjs")])
}

const steps = {
  build: () => {
    buildPages()
    installCms()
    npm(["run", "build"])
  },
  dev: () => {
    buildPages()
    installCms()
    run(["server.mjs", "--develop"])
  },
}

const step = steps[process.argv[2]]
if (!step) {
  console.error(`usage: node scripts/site.mjs ${Object.keys(steps).join("|")}`)
  process.exit(2)
}
step()
