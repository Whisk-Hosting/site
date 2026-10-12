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

const cms = path.join(import.meta.dirname, "cms")
const r = spawnSync(process.execPath, [path.join(cms, "node_modules", "payload", "bin.js"), "migrate"], { cwd: cms, stdio: "inherit", env: { ...process.env, CMS_STEP: "migrate" } })
process.exit(r.status ?? 1)
