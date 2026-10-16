// The blocks a page is built from. Each has an Astro component of the same name that draws it
// (../storefront/src/blocks/), and a moved site adds its own blocks the same way: a file here,
// listed below, and its component there. A block whose nested names pass Postgres's 63 letters
// takes a short slug, or `dbName: ({ tableName }) => `${tableName}_short``: a plain-text dbName
// gives every collection using the block one shared table, and their pages' blocks mix.
import type { Block, Field } from "payload"
import { lexicalHTMLField } from "@payloadcms/richtext-lexical"

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

export const pageBlocks: Block[] = [Hero, Content, MediaBlock, Columns, Products, Form, Html]

// A product's own page draws its price, options and stock from the shop; these add to it.
export const productBlocks: Block[] = [Content, MediaBlock, Columns, Html]
