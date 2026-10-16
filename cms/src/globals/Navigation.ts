// The site's frame: its name and the links across the top of every page, and the footer's
// columns and note. A shop's also says how its own lists show in search results.
import type { Field, GlobalConfig } from "payload"
import { anyone, staff } from "../access"
import { inShop } from "../app"
import { editedBy } from "../edited"

const links = (name: string, maxRows: number): Field => ({
  name,
  type: "array",
  label: "Links",
  labels: { singular: "Link", plural: "Links" },
  maxRows,
  fields: [
    { name: "label", type: "text", required: true },
    { name: "url", type: "text", required: true },
  ],
})

export const Menus: GlobalConfig = {
  slug: "menus",
  label: "Menu",
  admin: { group: "Website" },
  access: { read: anyone, update: staff },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Top",
          fields: [
            // A shop's name is its store's, set in the shop's settings.
            { name: "name", label: "Site name", type: "text", admin: { hidden: inShop() } },
            links("header", 12),
          ],
        },
        {
          label: "Footer",
          fields: [
            { name: "columns", type: "array", labels: { singular: "Column", plural: "Columns" }, maxRows: 4, fields: [{ name: "heading", type: "text" }, links("links", 12)] },
            { name: "note", type: "textarea" },
          ],
        },
        {
          // How the shop's own lists show in search results: all products, and each category.
          label: "Shop in search",
          admin: { condition: () => inShop() },
          fields: [
            { name: "productsTitle", label: "Products: title in search results", type: "text" },
            { name: "productsDescription", label: "Products: description", type: "textarea", maxLength: 1000 },
            {
              name: "categories",
              type: "array",
              maxRows: 100,
              labels: { singular: "Category", plural: "Categories" },
              fields: [
                { name: "handle", type: "text", required: true, admin: { description: "The category's handle in the shop admin." } },
                { name: "searchTitle", label: "Title in search results", type: "text" },
                { name: "description", type: "textarea", maxLength: 1000 },
              ],
            },
          ],
        },
      ],
    },
    editedBy,
  ],
}
