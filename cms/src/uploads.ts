// The media library's files on Whisk: each goes through the platform's uploads (src/whisk.ts),
// is recorded on the document by its upload id, and is served by the edge, resized for the page
// that asks. Payload's own resizing is off (src/collections/Media.ts), since the edge does it.
import type { FileData } from "payload"
import type { Adapter } from "@payloadcms/plugin-cloud-storage/types"
import { hideUpload, mediaPath, uploadFile } from "./whisk"

export const whiskUploads: Adapter = () => ({
  name: "whisk",
  fields: [{ name: "whiskId", type: "text", admin: { hidden: true } }],
  // What this answers is saved on the document.
  handleUpload: async ({ file }) =>
    ({ whiskId: await uploadFile({ filename: file.filename, contentType: file.mimeType, content: file.buffer }) }) as Partial<FileData>,
  handleDelete: async ({ doc }) => {
    const id = (doc as { whiskId?: string }).whiskId
    if (id) await hideUpload(id)
  },
  // A file kept on a laptop (no Whisk upload) is served by the editor itself.
  generateURL: ({ data, filename }) => (data?.whiskId ? mediaPath(data.whiskId, data.mimeType ?? "") : filename ? `/cms/api/media/file/${encodeURIComponent(filename)}` : ""),
  staticHandler: (_req, { doc }) => {
    const d = doc as { whiskId?: string; mimeType?: string } | undefined
    if (!d?.whiskId) return new Response(null, { status: 404 })
    return new Response(null, { status: 302, headers: { location: mediaPath(d.whiskId, d.mimeType ?? "") } })
  },
})
