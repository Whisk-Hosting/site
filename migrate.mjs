// The migrate step (whisk.yaml): the table form posts are kept in, then the editor's migrations
// (Payload's, cms/migrations, in the database's cms schema). It runs with the direct database
// connection and none of the app's other platform environment (CONTRACT.md §5), before traffic
// moves to the new version; CMS_STEP tells the editor it signs nothing here. Safe to run on every
// deploy.
import { spawnSync } from "node:child_process"
import path from "node:path"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 })
await sql`create table if not exists form_entries (
  id bigint generated always as identity primary key,
  form text not null,
  page text,
  data jsonb not null,
  created_at timestamptz not null default now()
)`
await sql.end()

// Payload's command loads its TypeScript config through a loader thread, and now and then the
// process runs out of work before the config arrives: it exits 0 having migrated nothing. A
// process that ends that way (beforeExit) exits STALLED instead, and is run again.
const STALLED = 75
const stalls = `data:text/javascript,process.on("beforeExit",()=>{process.exitCode=${STALLED}})`
const cms = path.join(import.meta.dirname, "cms")
const editor = (tries) => {
  const r = spawnSync(process.execPath, ["--import", stalls, path.join(cms, "node_modules", "payload", "bin.js"), "migrate"], { cwd: cms, stdio: "inherit", env: { ...process.env, CMS_STEP: "migrate" } })
  if (r.status === STALLED && tries > 1) return editor(tries - 1)
  if (r.status === STALLED) console.error("The editor's migrations stopped before they ran, three times.")
  return r.status ?? 1
}
process.exit(editor(3))
