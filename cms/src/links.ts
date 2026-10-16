// Links in rich text keep the address they were written with. Payload's link field
// percent-encodes any address its own check rejects: a bare "#" became "%23", which sent
// visitors to a page that does not exist, and so would "javascript:void(0)" or a path with a
// comma. Its check also refuses an address with a space, which stopped a whole page importing.
import type { Field, FieldAffectingData, FieldHook } from "payload"

/** A link's address as written, with spaces escaped so the field accepts it. Pure. */
export const keptHref = (value: unknown): unknown => (typeof value === "string" ? value.trim().replace(/ /g, "%20") : value)

const keep: FieldHook = ({ value }) => keptHref(value)

/** The link feature's fields, with the address kept as written rather than encoded. Pure. */
export const keepingHrefs = ({ defaultFields }: { defaultFields: FieldAffectingData[] }): (Field | FieldAffectingData)[] =>
  defaultFields.map((f) => (f.name === "url" && "hooks" in f ? ({ ...f, hooks: { ...f.hooks, beforeValidate: [keep], beforeChange: [] } } as FieldAffectingData) : f))

/** Every link address in a piece of HTML with its spaces escaped, so starting content written
 * with "tel:0800 002 182" imports (the field's own hooks do not run for words added in code). Pure. */
export const keptHrefs = (html: string): string => html.replace(/href="([^"]*)"/g, (_, url: string) => `href="${url.trim().replace(/ /g, "%20")}"`)
