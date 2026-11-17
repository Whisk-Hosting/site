// The website's build and laptop steps, in Node so they run the same in PowerShell, Command
// Prompt and a Unix shell.
//   node scripts/site.mjs build   the server (Go, main.go)
//   node scripts/site.mjs files   the site's files made small beside them (scripts/optimise.mjs),
//                                 which the image does; on a laptop the server sends them as they are
//   node scripts/site.mjs dev     the server reading the theme again on each page, with Whisk's
//                                 content engine beside it (whisk dev downloads it)
import { spawnSync } from "node:child_process"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")

const run = (cmd, args, cwd = root) => {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
const files = () => run(process.execPath, [path.join(root, "scripts", "optimise.mjs")])
const server = () => run("go", ["build", "-trimpath", "-o", process.platform === "win32" ? "server.exe" : "server", "."])

const steps = {
  build: server,
  files,
  dev: () => run("go", ["run", ".", "--develop"]),
}

const step = steps[process.argv[2]]
if (!step) {
  console.error(`usage: node scripts/site.mjs ${Object.keys(steps).join("|")}`)
  process.exit(2)
}
step()
