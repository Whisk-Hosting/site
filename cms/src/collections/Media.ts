// Pictures and documents the pages use. On Whisk each file goes through the platform's uploads
// and the edge serves pictures resized for the page (src/uploads.ts); on a laptop they are kept
// in cms/media. `source` is the file a starting page named (src/content.ts), so importing again
// reuses it.
import type { CollectionConfig } from "payload"
import { anyone, staff } from "../access"

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "File", plural: "Media" },
  admin: { group: "Website", useAsTitle: "alt", defaultColumns: ["filename", "alt", "updatedAt"] },
  access: { read: anyone, create: staff, update: staff, delete: staff },
  upload: {
    staticDir: "media",
    mimeTypes: ["image/*", "application/pdf", "video/mp4", "video/webm"],
    // The edge resizes pictures (/.whisk/img/<id>?w=…), so no sizes are made here.
    imageSizes: [],
    focalPoint: false,
    crop: false,
  },
  fields: [
    { name: "alt", label: "Description", type: "text", required: true },
    { name: "source", type: "text", unique: true, index: true, admin: { hidden: true } },
  ],
}
