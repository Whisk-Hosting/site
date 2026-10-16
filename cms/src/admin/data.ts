// What the dashboard and the enquiries list read: the pages, the pictures and the form entries
// (kept by the site's server in the form_entries table, server.mjs). Each read has a deadline and
// stands in an empty answer when it fails, so the editor always opens.
import type { Payload } from "payload"
import { sql } from "@payloadcms/db-postgres"
import { fieldLabels, type Entry } from "./summary"

// The business's time zone for the times shown (whisk.yaml env SITE_TIME_ZONE), or UTC.
export const TIME_ZONE = process.env.SITE_TIME_ZONE || "UTC"

const within = <T,>(ms: number, p: Promise<T>, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]).catch(() => fallback)

type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }

export type PageRow = { id: number | string; title: string; path: string; _status?: string | null; updatedAt: string; editedBy?: string | null }

export const pagesOf = (payload: Payload): Promise<PageRow[]> =>
  within(
    5_000,
    payload
      .find({ collection: "pages", depth: 0, limit: 500, sort: "-updatedAt", draft: true, overrideAccess: true, select: { title: true, path: true, _status: true, updatedAt: true, editedBy: true } as never })
      .then((r) => r.docs as unknown as PageRow[]),
    [],
  )

export const mediaCount = (payload: Payload): Promise<number | null> =>
  within(5_000, payload.count({ collection: "media", overrideAccess: true }).then((r) => r.totalDocs), null)

// The form entries, newest first; null when they cannot be read (the table is made by the deploy's
// migrate step, so a laptop that has not run it has none).
export const entriesOf = async (payload: Payload, limit: number, offset = 0): Promise<{ rows: Entry[]; total: number } | null> => {
  const db = payload.db as unknown as Db
  const read = async () => {
    const [rows, count] = await Promise.all([
      db.drizzle.execute(sql`select id, form, page, data, created_at from form_entries order by created_at desc, id desc limit ${limit} offset ${offset}`),
      db.drizzle.execute(sql`select count(*)::int as n from form_entries`),
    ])
    return { rows: rows.rows as unknown as Entry[], total: Number(count.rows[0]?.n ?? 0) }
  }
  return within(5_000, read(), null)
}

// Every form's field names in words, from the pages' form blocks.
export const labelsOf = (payload: Payload) =>
  within(
    5_000,
    payload.find({ collection: "pages", depth: 0, limit: 500, overrideAccess: true, select: { layout: true } as never }).then((r) => fieldLabels(r.docs)),
    new Map<string, Map<string, string>>(),
  )
