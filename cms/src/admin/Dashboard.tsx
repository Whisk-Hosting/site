// The editor's first screen: the site at a glance (its pages, enquiries and pictures), the latest
// enquiries, and every page with when and by whom it was last changed, each a step from editing.
import type { AdminViewServerProps } from "payload"
import { Gutter } from "@payloadcms/ui"
import Link from "next/link"
import { entriesOf, labelsOf, mediaCount, pagesOf, TIME_ZONE } from "./data"
import { formTitle, senderOf, when } from "./summary"

export const Dashboard = async ({ initPageResult }: AdminViewServerProps) => {
  const payload = initPageResult.req.payload
  const [pages, pictures, entries, labels, menus] = await Promise.all([
    pagesOf(payload),
    mediaCount(payload),
    entriesOf(payload, 5),
    labelsOf(payload),
    payload.findGlobal({ slug: "menus", depth: 0, overrideAccess: true }).catch(() => null) as Promise<{ name?: string | null } | null>,
  ])
  const drafts = pages.filter((p) => p._status === "draft").length
  const name = menus?.name?.trim() || "Your website"
  return (
    <Gutter className="wd">
      <header className="wd-head">
        <h1>{name}</h1>
        <nav className="wd-actions" aria-label="Quick actions">
          <a className="wd-btn wd-btn-main" href="/" target="_blank" rel="noopener">View site</a>
          <Link className="wd-btn" href="/cms/collections/pages/create">New page</Link>
          <Link className="wd-btn" href="/cms/globals/menus">Edit menu</Link>
          <Link className="wd-btn" href="/cms/collections/media/create">Add picture</Link>
        </nav>
      </header>

      <section className="wd-stats" aria-label="At a glance">
        <Link className="wd-stat" href="/cms/collections/pages">
          <span className="wd-num">{pages.length}</span>
          <span>Pages{drafts ? `, ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}</span>
        </Link>
        <Link className="wd-stat" href="/cms/enquiries">
          <span className="wd-num">{entries ? entries.total : "–"}</span>
          <span>Enquiries</span>
        </Link>
        <Link className="wd-stat" href="/cms/collections/media">
          <span className="wd-num">{pictures ?? "–"}</span>
          <span>Pictures and files</span>
        </Link>
      </section>

      <section className="wd-panel">
        <div className="wd-panel-head">
          <h2>Latest enquiries</h2>
          <Link href="/cms/enquiries">All enquiries</Link>
        </div>
        {!entries ? (
          <p className="wd-empty">Enquiries can't be read right now. Reload in a moment.</p>
        ) : entries.rows.length === 0 ? (
          <p className="wd-empty">No enquiries yet.</p>
        ) : (
          <ul className="wd-list">
            {entries.rows.map((e) => {
              const s = senderOf(e, labels)
              return (
                <li key={String(e.id)}>
                  <Link href={`/cms/enquiries#e${e.id}`} className="wd-row">
                    <strong>{s.who}</strong>
                    <span>{formTitle(e.form)}</span>
                    <span>{s.email ?? s.phone ?? ""}</span>
                    <time dateTime={new Date(e.created_at).toISOString()}>{when(e.created_at, TIME_ZONE)}</time>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="wd-panel">
        <div className="wd-panel-head">
          <h2>Pages</h2>
          <Link href="/cms/collections/pages">All pages</Link>
        </div>
        {pages.length === 0 ? (
          <p className="wd-empty">No pages yet. <Link href="/cms/collections/pages/create">Make the first one</Link></p>
        ) : (
          <ul className="wd-list">
            {pages.map((p) => (
              <li key={String(p.id)} className="wd-page">
                <Link href={`/cms/collections/pages/${p.id}`} className="wd-row">
                  <strong>{p.title}</strong>
                  <span className="wd-path">{p.path}</span>
                  <span>{p._status === "draft" ? "Draft" : "Published"}</span>
                  <time dateTime={new Date(p.updatedAt).toISOString()}>
                    {when(p.updatedAt, TIME_ZONE)}
                    {p.editedBy ? `, ${p.editedBy}` : ""}
                  </time>
                </Link>
                <a className="wd-view" href={p.path} target="_blank" rel="noopener" aria-label={`View ${p.title}`}>View</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Gutter>
  )
}

export default Dashboard
