// The site's frame: its name and the links across the top of every page, and the footer's
// columns and note.
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
      ],
    },
    editedBy,
  ],
}
