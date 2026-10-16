// The blocks a page is built from. Each has an Astro component of the same name that draws it
// (../storefront/src/blocks/), and a moved site adds its own blocks the same way: a file here,
// listed below, and its component there. A block whose nested names pass Postgres's 63 letters
// takes a short slug, or `dbName: ({ tableName }) => `${tableName}_short``: a plain-text dbName
// gives every collection using the block one shared table, and their pages' blocks mix.
import type { Block, Field, FieldHook } from "payload"
import { lexicalHTMLField } from "@payloadcms/richtext-lexical"
import { LIST_SLUGS, type ListSlug } from "../collections/Lists"

const link = (name = "link"): Field => ({
  name,
  type: "group",
  fields: [
    { name: "label", type: "text" },
    { name: "url", type: "text" },
  ],
})

const image = (name = "image", required = false): Field => ({ name, type: "upload", relationTo: "media", required })

const richText = (name = "content"): Field[] => [
  { name, type: "richText" },
  lexicalHTMLField({ htmlFieldName: `${name}_html`, lexicalFieldName: name }),
]

export const Hero: Block = {
  slug: "hero",
  admin: { disableBlockName: true },
  interfaceName: "HeroBlock",
  fields: [{ name: "heading", type: "text", required: true }, { name: "text", type: "textarea" }, image(), link()],
}

export const Content: Block = {
  slug: "content",
  admin: { disableBlockName: true },
  interfaceName: "ContentBlock",
  fields: richText(),
}

export const MediaBlock: Block = {
  slug: "media",
  admin: { disableBlockName: true },
  interfaceName: "MediaBlock",
  fields: [image("image", true), { name: "caption", type: "text" }, { name: "wide", type: "checkbox" }],
}

export const Columns: Block = {
  slug: "columns",
  admin: { disableBlockName: true },
  interfaceName: "ColumnsBlock",
  fields: [
    { name: "heading", type: "text" },
    {
      name: "items",
      type: "array",
      minRows: 1,
      maxRows: 6,
      fields: [{ name: "heading", type: "text" }, { name: "text", type: "textarea" }, image(), link()],
    },
  ],
}

// Products from the shop (Medusa), read live when the page is drawn. Offered only in a shop.
export const Products: Block = {
  slug: "products",
  admin: { disableBlockName: true },
  interfaceName: "ProductsBlock",
  fields: [
    { name: "heading", type: "text" },
    {
      name: "show",
      type: "select",
      required: true,
      defaultValue: "latest",
      options: [
        { label: "Newest", value: "latest" },
        { label: "A collection", value: "collection" },
        { label: "A category", value: "category" },
      ],
    },
    { name: "handle", type: "text", admin: { condition: (_, s) => s?.show === "collection" || s?.show === "category" } },
    { name: "limit", type: "number", required: true, defaultValue: 8, min: 1, max: 24 },
  ],
}

// A form that posts to /forms/<name>; each entry is kept in the app's form_entries table.
export const Form: Block = {
  slug: "form",
  admin: { disableBlockName: true },
  interfaceName: "FormBlock",
  fields: [
    { name: "name", type: "text", required: true, validate: (v: unknown) => (typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,62}$/.test(v)) || "Lower-case letters, digits and dashes, such as contact." },
    { name: "heading", type: "text" },
    {
      name: "fields",
      type: "array",
      minRows: 1,
      maxRows: 30,
      fields: [
        { name: "name", type: "text", required: true },
        { name: "label", type: "text", required: true },
        {
          name: "type",
          type: "select",
          required: true,
          defaultValue: "text",
          options: ["text", "email", "tel", "textarea", "checkbox"].map((v) => ({ label: v, value: v })),
        },
        { name: "required", type: "checkbox" },
      ],
    },
    { name: "submit", type: "text", required: true, defaultValue: "Send" },
    { name: "thanks", type: "text", required: true, defaultValue: "Thanks, we'll be in touch." },
  ],
}

// Markup drawn as it is: an embed, a map, or a part of a moved page with no block of its own.
export const Html: Block = {
  slug: "html",
  admin: { disableBlockName: true },
  interfaceName: "HtmlBlock",
  fields: [{ name: "html", type: "code", required: true, admin: { language: "html" } }],
}

const LIST_LABELS: Record<ListSlug, string> = { testimonials: "Testimonials", people: "People", faqs: "Questions", locations: "Locations", logos: "Logos" }

// The entries a list block shows, in the list's order: those picked, or all of the list (of one
// topic when given) up to the limit. Read with the page, so the site draws them with it.
// Each read on a connection of its own: several list blocks are read at once, and the request's
// own connection takes one query at a time. Every entry is public (src/collections/Lists.ts).
const entries: FieldHook = async ({ siblingData, req: { payload } }) => {
  const slug = siblingData?.list as ListSlug | undefined
  if (!slug || !LIST_SLUGS.includes(slug)) return []
  if (siblingData.show === "picked") {
    const picked: unknown[] = siblingData[slug] ?? []
    const ids = picked.map((p) => (p && typeof p === "object" ? (p as { id: number }).id : p)).filter((id) => id != null)
    if (!ids.length) return []
    const { docs } = await payload.find({ collection: slug, where: { id: { in: ids } }, depth: 1, limit: ids.length, overrideAccess: true })
    return ids.map((id) => docs.find((d) => d.id === id)).filter(Boolean)
  }
  const topic = typeof siblingData.topic === "string" && siblingData.topic.trim()
  const { docs } = await payload.find({
    collection: slug,
    ...(topic ? { where: { topic: { equals: topic } } } : {}),
    sort: "_order",
    depth: 1,
    limit: Math.min(Math.max(Number(siblingData.limit) || 12, 1), 100),
    overrideAccess: true,
  })
  return docs
}

// One of the website's shared lists (src/collections/Lists.ts) on a page, as Payload's website
// template shows its posts: all of it, a topic of it, or the entries picked.
export const List: Block = {
  slug: "list",
  admin: { disableBlockName: true },
  interfaceName: "ListBlock",
  fields: [
    { name: "heading", type: "text" },
    { name: "intro", type: "textarea" },
    { name: "list", type: "select", required: true, defaultValue: "testimonials", options: LIST_SLUGS.map((s) => ({ label: LIST_LABELS[s], value: s })) },
    {
      name: "show",
      type: "radio",
      required: true,
      defaultValue: "all",
      options: [
        { label: "All of the list", value: "all" },
        { label: "The ones I pick", value: "picked" },
      ],
    },
    { name: "topic", type: "text", admin: { condition: (_, s) => s?.show !== "picked", description: "Only the entries with this topic, such as Fleet. Empty shows them all." } },
    { name: "limit", type: "number", defaultValue: 12, min: 1, max: 100, admin: { condition: (_, s) => s?.show !== "picked" } },
    ...LIST_SLUGS.map(
      (s): Field => ({ name: s, label: LIST_LABELS[s], type: "relationship", relationTo: s, hasMany: true, admin: { condition: (_, d) => d?.show === "picked" && d?.list === s } }),
    ),
    { name: "entries", type: "json", virtual: true, admin: { hidden: true }, hooks: { afterRead: [entries] } },
  ],
}

export const pageBlocks: Block[] = [Hero, Content, MediaBlock, Columns, List, Products, Form, Html]

// A product's own page draws its price, options and stock from the shop; these add to it.
export const productBlocks: Block[] = [Content, MediaBlock, Columns, List, Html]
