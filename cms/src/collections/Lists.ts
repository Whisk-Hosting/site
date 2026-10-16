// The website's shared lists: the things a site shows in many places, kept once, as Payload's own
// website template keeps its posts. A page shows a list with the list block (src/blocks), all of
// it, a topic of it, or the entries picked; changing an entry changes every page showing it. The
// team orders each list by dragging. `source` is the file a starting entry came from
// (src/content.ts), so importing again leaves it as the team made it.
import type { CollectionConfig, Field } from "payload"
import { lexicalHTMLField } from "@payloadcms/richtext-lexical"
import { anyone, staff } from "../access"
import { editedBy } from "../edited"
import { LISTS, type ListName } from "../content"

const picture = (name = "picture", required = false): Field => ({ name, type: "upload", relationTo: "media", required })

// Entries shown together, such as Fleet or Home, so one list serves several pages.
const topic: Field = { name: "topic", type: "text", index: true, admin: { position: "sidebar", description: "Shown together, such as Fleet or Home." } }

const source: Field = { name: "source", type: "text", unique: true, index: true, admin: { hidden: true } }

const list = (slug: string, singular: string, plural: string, useAsTitle: string, columns: string[], fields: Field[]): CollectionConfig => ({
  slug,
  labels: { singular, plural },
  orderable: true,
  admin: { group: "Lists", useAsTitle, defaultColumns: [...columns, "topic", "updatedAt"] },
  versions: { maxPerDoc: 20 },
  access: { read: anyone, create: staff, update: staff, delete: staff },
  fields: [...fields, topic, source, editedBy],
})

export const Testimonials = list("testimonials", "Testimonial", "Testimonials", "name", ["name", "role"], [
  { name: "quote", type: "textarea", required: true },
  { name: "name", type: "text", required: true },
  { name: "role", label: "Role or company", type: "text" },
  picture(),
])

export const People = list("people", "Person", "People", "name", ["name", "role"], [
  { name: "name", type: "text", required: true },
  { name: "role", type: "text" },
  picture(),
  { name: "bio", type: "textarea" },
  { name: "email", type: "email" },
  { name: "phone", type: "text" },
])

export const Faqs = list("faqs", "Question", "Questions", "question", ["question"], [
  { name: "question", type: "text", required: true },
  { name: "answer", type: "richText", required: true },
  lexicalHTMLField({ htmlFieldName: "answer_html", lexicalFieldName: "answer" }),
])

export const Locations = list("locations", "Location", "Locations", "name", ["name", "phone"], [
  { name: "name", type: "text", required: true },
  { name: "address", type: "textarea" },
  { name: "phone", type: "text" },
  { name: "email", type: "email" },
  { name: "hours", label: "Opening hours", type: "textarea" },
  { name: "map", label: "Map link", type: "text" },
  picture(),
])

export const Logos = list("logos", "Logo", "Logos", "name", ["name", "url"], [
  { name: "name", type: "text", required: true },
  picture("picture", true),
  { name: "url", label: "Link", type: "text" },
])

// In the order of LISTS (src/content.ts), the starting content's names for them.
export const lists: CollectionConfig[] = LISTS.map((slug) => ({ testimonials: Testimonials, people: People, faqs: Faqs, locations: Locations, logos: Logos })[slug])

export const LIST_SLUGS = LISTS
export type ListSlug = ListName
