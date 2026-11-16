// The website's build and laptop steps, in Node so they run the same in PowerShell, Command
// Prompt and a Unix shell.
//   node scripts/site.mjs build   the server (Go, main.go) and the editor (cms/)
//   node scripts/site.mjs files   the site's files made small beside them (scripts/optimise.mjs),
//                                 which the image does; on a laptop the server sends them as they are
//   node scripts/site.mjs dev     the editor built once, then the server reading the theme again
//                                 on each page and the editor rebuilding as its files change
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const cms = path.join(root, "cms")

const run = (cmd, args, cwd = root) => {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
const installCms = () => {
  if (!existsSync(path.join(cms, "node_modules", "next"))) run("npm", ["ci", "--no-audit", "--no-fund"], cms)
}
const files = () => run(process.execPath, [path.join(root, "scripts", "optimise.mjs")])
const server = () => run("go", ["build", "-trimpath", "-o", process.platform === "win32" ? "server.exe" : "server", "."])

const steps = {
  build: () => {
    server()
    installCms()
    run("npm", ["run", "build"], cms)
  },
  files,
  dev: () => {
    installCms()
    run("go", ["run", ".", "--develop"])
  },
}

const step = steps[process.argv[2]]
if (!step) {
  console.error(`usage: node scripts/site.mjs ${Object.keys(steps).join("|")}`)
  process.exit(2)
}
step()
