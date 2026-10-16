// What a product's page adds to the shop's product: its story, pictures and details. The page is
// at /products/<handle>, drawn from Medusa (price, options, stock) and from this. A website has
// the collection too, hidden, so its tables match a shop's.
import type { CollectionConfig } from "payload"
import { inShop } from "../app"
import { productBlocks } from "../blocks"
import { publishedOrStaff, staff } from "../access"
import { previewUrl } from "../preview"
import { editedBy } from "../edited"

const isHandle = (v: unknown) => typeof v === "string" && /^[a-z0-9][a-z0-9-]*$/.test(v)

export const ProductPages: CollectionConfig = {
  slug: "product-pages",
  labels: { singular: "Product page", plural: "Product pages" },
  admin: {
    group: "Website",
    useAsTitle: "handle",
    hidden: () => !inShop(),
    defaultColumns: ["handle", "_status", "updatedAt"],
    livePreview: { url: ({ data, req }) => previewUrl(req, `/products/${data?.handle ?? ""}`) },
    preview: (doc, { req }) => previewUrl(req, `/products/${doc?.handle ?? ""}`),
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  access: { read: publishedOrStaff, create: staff, update: staff, delete: staff },
  fields: [
    { name: "handle", type: "text", required: true, unique: true, index: true, validate: (v: unknown) => isHandle(v) || "The product's handle in the shop admin." },
    { name: "layout", type: "blocks", blocks: productBlocks },
    {
      type: "collapsible",
      label: "Search",
      admin: { initCollapsed: true },
      fields: [
        // The page's whole <title> when set; otherwise the product's title and the shop's name.
        { name: "searchTitle", label: "Title in search results", type: "text" },
        { name: "description", type: "textarea", maxLength: 1000 },
        // A product sold in sizes or packs as separate products: the one search engines should list.
        {
          name: "canonical",
          label: "Listed in search as",
          type: "text",
          validate: (v: unknown) => v == null || v === "" || isHandle(v) || "Another product's handle in the shop admin, such as gloves-large.",
          admin: { description: "Another product's handle, when this one is the same product in another size." },
        },
      ],
    },
    editedBy,
  ],
}
