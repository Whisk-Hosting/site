// What a product's page adds to the shop's product: its story, pictures and details. The page is
// at /products/<handle>, drawn from Medusa (price, options, stock) and from this. A website has
// the collection too, hidden, so its tables match a shop's.
import type { CollectionConfig } from "payload"
import { inShop } from "../app"
import { productBlocks } from "../blocks"
import { publishedOrStaff, staff } from "../access"
import { previewUrl } from "../preview"
import { editedBy } from "../edited"

export const ProductPages: CollectionConfig = {
  slug: "product-pages",
  labels: { singular: "Product page", plural: "Product pages" },
  admin: {
    useAsTitle: "handle",
    hidden: () => !inShop(),
    defaultColumns: ["handle", "_status", "updatedAt"],
    livePreview: { url: ({ data, req }) => previewUrl(req, `/products/${data?.handle ?? ""}`) },
    preview: (doc, { req }) => previewUrl(req, `/products/${doc?.handle ?? ""}`),
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  access: { read: publishedOrStaff, create: staff, update: staff, delete: staff },
  fields: [
    { name: "handle", type: "text", required: true, unique: true, index: true, validate: (v: unknown) => (typeof v === "string" && /^[a-z0-9][a-z0-9-]*$/.test(v)) || "The product's handle in the shop admin." },
    { name: "layout", type: "blocks", blocks: productBlocks },
    editedBy,
  ],
}
