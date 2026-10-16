// Every entry the site's forms received, newest first, fifty to a page, each opening to all it
// said. Only the team reaches it: the editor's own sign-in guards every view (src/collections/Users.ts).
import type { AdminViewServerProps } from "payload"
import { DefaultTemplate } from "@payloadcms/next/templates"
import { Gutter, SetStepNav } from "@payloadcms/ui"
import Link from "next/link"
import { entriesOf, labelsOf, TIME_ZONE } from "./data"
import { fieldsOf, formTitle, senderOf, when } from "./summary"

const PER_PAGE = 50

export const Enquiries = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const page = Math.max(1, Number.parseInt(String(searchParams?.page ?? "1"), 10) || 1)
  const [entries, labels] = await Promise.all([entriesOf(req.payload, PER_PAGE, (page - 1) * PER_PAGE), labelsOf(req.payload)])
  const pages = entries ? Math.max(1, Math.ceil(entries.total / PER_PAGE)) : 1
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: "Enquiries" }]} />
      <Gutter className="wd">
        <header className="wd-head">
          <h1>Enquiries</h1>
          {entries && <span className="wd-count">{entries.total}</span>}
        </header>
        {!req.user ? null : !entries ? (
          <p className="wd-empty">Enquiries can't be read right now. Reload in a moment.</p>
        ) : entries.rows.length === 0 ? (
          <p className="wd-empty">No enquiries yet.</p>
        ) : (
          <ul className="wd-entries">
            {entries.rows.map((e) => {
              const s = senderOf(e, labels)
              return (
                <li key={String(e.id)} id={`e${e.id}`}>
                  <details>
                    <summary className="wd-row">
                      <strong>{s.who}</strong>
                      <span>{formTitle(e.form)}</span>
                      <span>{s.email ?? s.phone ?? ""}</span>
                      <time dateTime={new Date(e.created_at).toISOString()}>{when(e.created_at, TIME_ZONE)}</time>
                    </summary>
                    <dl className="wd-fields">
                      {fieldsOf(e, labels).map((f) => (
                        <div key={f.label}>
                          <dt>{f.label}</dt>
                          <dd>{f.value}</dd>
                        </div>
                      ))}
                      {e.page && (
                        <div>
                          <dt>Sent from</dt>
                          <dd><a href={e.page} target="_blank" rel="noopener">{e.page}</a></dd>
                        </div>
                      )}
                    </dl>
                    <div className="wd-actions">
                      {s.email && <a className="wd-btn wd-btn-main" href={`mailto:${s.email}`}>Reply by email</a>}
                      {s.phone && <a className="wd-btn" href={`tel:${s.phone.replace(/\s+/g, "")}`}>Call</a>}
                    </div>
                  </details>
                </li>
              )
            })}
          </ul>
        )}
        {pages > 1 && (
          <nav className="wd-pager" aria-label="Pages of enquiries">
            {page > 1 ? <Link href={`/cms/enquiries?page=${page - 1}`}>Newer</Link> : <span />}
            <span>{page} of {pages}</span>
            {page < pages ? <Link href={`/cms/enquiries?page=${page + 1}`}>Older</Link> : <span />}
          </nav>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}

export default Enquiries
