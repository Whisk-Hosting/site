// The website's pages. Each has an address, and the storefront (Astro) draws the page there from
// its blocks (../storefront/src/pages/[...path].astro). Drafts are seen only by the team, in the
// preview beside the editor.
import type { CollectionConfig } from "payload"
import { inShop, MARKET_OPTIONS, markets } from "../app"
import { pageBlocks } from "../blocks"
import { publishedOrStaff, staff } from "../access"
import { pathProblem } from "../paths"
import { previewUrl } from "../preview"
import { editedBy } from "../edited"

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    group: "Website",
    defaultColumns: ["title", "path", "_status", "updatedAt"],
    livePreview: { url: ({ data, req }) => previewUrl(req, typeof data?.path === "string" ? data.path : "/") },
    preview: (doc, { req }) => previewUrl(req, typeof doc?.path === "string" ? doc.path : "/"),
  },
  // One page per address on each site: a page for every site, and one for a market's own site
  // (market) beside it, which that site shows instead.
  indexes: [{ fields: ["path", "market"], unique: true }],
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  access: { read: publishedOrStaff, create: staff, update: staff, delete: staff },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "path",
      label: "Address",
      type: "text",
      required: true,
      index: true,
      defaultValue: "/",
      validate: async (v: unknown, { req, id, siblingData }: { req: any; id?: string | number; siblingData?: { market?: string | null } }) => {
        if (typeof v !== "string") return "An address starts with /."
        const problem = pathProblem(v)
        if (problem) return problem
        const market = siblingData?.market || null
        const taken = await req.payload.find({
          collection: "pages",
          where: { and: [{ path: { equals: v } }, market ? { market: { equals: market } } : { market: { exists: false } }, ...(id ? [{ id: { not_equals: id } }] : [])] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        return taken.docs.length ? `Another page has the address ${v}.` : true
      },
    },
    {
      // The site the page is for, in a shop that sells in several markets; empty is every site.
      name: "market",
      label: "Only on",
      type: "select",
      options: MARKET_OPTIONS,
      admin: { position: "sidebar", hidden: markets().length < 2 },
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
