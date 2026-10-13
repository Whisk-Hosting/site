// The website's pages. Each has an address, and the storefront (Astro) draws the page there from
// its blocks (../storefront/src/pages/[...path].astro). Drafts are seen only by the team, in the
// preview beside the editor.
import type { CollectionConfig } from "payload"
import { inShop } from "../app"
import { pageBlocks } from "../blocks"
import { publishedOrStaff, staff } from "../access"
import { pathProblem } from "../paths"
import { previewUrl } from "../preview"
import { editedBy } from "../edited"

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "path", "_status", "updatedAt"],
    livePreview: { url: ({ data, req }) => previewUrl(req, typeof data?.path === "string" ? data.path : "/") },
    preview: (doc, { req }) => previewUrl(req, typeof doc?.path === "string" ? doc.path : "/"),
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  access: { read: publishedOrStaff, create: staff, update: staff, delete: staff },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "path",
      label: "Address",
      type: "text",
      required: true,
      unique: true,
      index: true,
      defaultValue: "/",
      validate: (v: unknown) => (typeof v === "string" ? (pathProblem(v) ?? true) : "An address starts with /."),
    },
    {
      type: "tabs",
      tabs: [
        { label: "Content", fields: [{
            name: "layout",
            type: "blocks",
            blocks: pageBlocks,
            // A website has no products to show; its tables still hold the block, for the day it sells.
            filterOptions: () => (inShop() ? true : pageBlocks.map((b) => b.slug).filter((s) => s !== "products")),
          },] },
        {
          label: "Search",
          fields: [
            // The page's whole <title> when set, as a moved page had it; otherwise its title and the site's name.
            { name: "searchTitle", label: "Title in search results", type: "text" },
            { name: "description", type: "textarea", maxLength: 300 },
            { name: "image", type: "upload", relationTo: "media" },
            { name: "noindex", label: "Hide from search engines", type: "checkbox" },
            // Tags the page keeps from its old site: JSON-LD, hreflang, verification.
            { name: "head", type: "code", admin: { language: "html" } },
          ],
        },
      ],
    },
    editedBy,
  ],
}
