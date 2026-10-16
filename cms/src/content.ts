// The site's starting content, in cms/content/, added when the CMS starts: the template's home
// page, or a moved website's pages (MOVER.md §5.4 and §5.5). Content is only ever added. A page whose
// address already has a page, a product page whose handle has one, and a menu someone has saved
// are left as the team made them, so starting again never undoes an edit.
//
//   content/pages/*.json          {title, path, searchTitle?, description?, noindex?, head?, image?, layout}
//   content/product-pages/*.json  {handle, layout, searchTitle?, description?, canonical?}
//   content/<list>/*.json         an entry of a shared list (src/collections/Lists.ts): testimonials,
//                                  people, faqs, locations or logos, with that list's fields
//   content/menus.json            {name?, header: [{label, url}], columns: [{heading, links}], note,
//                                  productsTitle?, productsDescription?,
//                                  categories?: [{handle, searchTitle?, description?}]}
//   content/media/…               the files they name
//
// A file is named where a picture goes as {"file": "media/team.jpg", "alt": "The team"} (with no
// alt, the file's name in words), an entry of a shared list as {"entry": "testimonials/jane"} (its
// list and its file's name), and a content block may give its words as
// {"blockType": "content", "html": "<p>…</p>"}, and any rich-text field as {"html": "<p>…</p>"}. Each file is added on its own, so one that cannot
// be added is named in the log and leaves the rest as they are.
// Pure: what to add and how to read it. src/import.ts adds it; test/cms.test.ts tests this.
import path from "node:path"

export type FileRef = { file: string; alt: string }

export const isFileRef = (v: unknown): v is FileRef =>
  !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as FileRef).file === "string" && Object.keys(v).every((k) => k === "file" || k === "alt")

// Every file a piece of content names, once each.
export const fileRefs = (v: unknown): FileRef[] => {
  const seen = new Map<string, FileRef>()
  const walk = (x: unknown): void => {
    if (isFileRef(x)) seen.has(x.file) || seen.set(x.file, x)
    else if (Array.isArray(x)) x.forEach(walk)
    else if (x && typeof x === "object") Object.values(x).forEach(walk)
  }
  walk(v)
  return [...seen.values()]
}

// The shared lists, in the order their entries are added (src/collections/Lists.ts).
export const LISTS = ["testimonials", "people", "faqs", "locations", "logos"] as const
export type ListName = (typeof LISTS)[number]

// An entry of a shared list, named by its list and its file's name: {"entry": "testimonials/jane"}.
export type EntryRef = { entry: string }

export const isEntryRef = (v: unknown): v is EntryRef =>
  !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as EntryRef).entry === "string" && Object.keys(v).length === 1

// The list an entry's name is in, or null for a name that is not "<list>/<name>".
export const entryList = (entry: string): ListName | null => {
  const [list, name, ...rest] = entry.split("/")
  return name && !rest.length && (LISTS as readonly string[]).includes(list!) ? (list as ListName) : null
}

// An entry's name from its file in content/<list>/: "testimonials/jane" for jane.json.
export const entryName = (list: ListName, file: string) => `${list}/${path.basename(file, ".json")}`

// Every entry a piece of content names, once each.
export const entryRefs = (v: unknown): string[] => {
  const seen = new Set<string>()
  const walk = (x: unknown): void => {
    if (isEntryRef(x)) seen.add(x.entry)
    else if (Array.isArray(x)) x.forEach(walk)
    else if (x && typeof x === "object") Object.values(x).forEach(walk)
  }
  walk(v)
  return [...seen]
}

// Words for a rich-text field, given as HTML.
export const isHtmlRef = (v: unknown): v is { html: string } =>
  !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as { html?: unknown }).html === "string" && Object.keys(v).length === 1

// The content with each file named replaced by its media id, each entry named by its id (both in
// ids, by name), and each block's HTML by the words it holds (toRichText).
export const resolved = (v: unknown, ids: Map<string, number | string>, toRichText: (html: string) => unknown): unknown => {
  if (isFileRef(v)) return ids.get(v.file) ?? null
  if (isEntryRef(v)) return ids.get(v.entry) ?? null
  if (isHtmlRef(v)) return toRichText(v.html)
  // An entry left out leaves the rest of a list of them.
  if (Array.isArray(v)) return v.filter((x) => !isEntryRef(x) || ids.has(x.entry)).map((x) => resolved(x, ids, toRichText))
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>
    if (o.blockType === "content" && typeof o.html === "string") {
      const { html, ...rest } = o
      return { ...(resolved(rest, ids, toRichText) as object), content: toRichText(html) }
    }
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, resolved(x, ids, toRichText)]))
  }
  return v
}

// A picture's description when its page gives none: the words of its file's name.
export const altFrom = (file: string) =>
  path.basename(file, path.extname(file)).replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim()

// A file path inside content/, never outside it.
export const insideContent = (root: string, file: string): string | null => {
  const full = path.resolve(root, file)
  return full.startsWith(path.resolve(root) + path.sep) ? full : null
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
  ".avif": "image/avif", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
}
export const mimeOf = (file: string) => MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream"
