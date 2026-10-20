// Pictures and callouts inside the words of a page, as Payload's own website template has them:
// the editor's text holds a picture (with an optional caption) or a callout (a note, a tip or a
// warning) where it goes, so a moved article stays one piece of writing rather than a stack of
// blocks. `richTextField` gives a rich-text field and its HTML (`<name>_html`), drawn by
// src/inline.ts; the editor's features are set in payload.config.ts.
import type { Block, Field } from "payload"
import { lexicalHTMLField } from "@payloadcms/richtext-lexical"
import type { HTMLConvertersFunctionAsync } from "@payloadcms/richtext-lexical/html-async"
import { calloutHtml, pictureHtml, type MediaDoc } from "./inline"

export const Callout: Block = {
  slug: "callout",
  interfaceName: "CalloutBlock",
  labels: { singular: "Callout", plural: "Callouts" },
  fields: [
    {
      name: "tone",
      type: "select",
      required: true,
      defaultValue: "note",
      options: [
        { label: "Note", value: "note" },
        { label: "Tip", value: "tip" },
        { label: "Warning", value: "warning" },
      ],
    },
    { name: "title", type: "text" },
    { name: "text", type: "textarea", required: true },
  ],
}

// A picture's own fields in the text.
export const pictureFields: Field[] = [{ name: "caption", type: "text" }]

const converters: HTMLConvertersFunctionAsync = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: async ({ node, populate }) => {
    const n = node as { value: unknown; relationTo: string; fields?: { caption?: string | null } }
    const doc = (n.value && typeof n.value === "object" ? n.value : await populate?.({ id: n.value as number | string, collectionSlug: n.relationTo })) as MediaDoc | undefined
    return doc ? pictureHtml(doc, n.fields?.caption) : ""
  },
  blocks: {
    callout: ({ node }: { node: unknown }) => calloutHtml((node as { fields: { tone?: string; title?: string; text?: string } }).fields),
  },
})

/** A rich-text field and its HTML, `<name>_html`, with the pictures and callouts in it drawn. */
export const richTextField = (name: string, required = false): Field[] => [
  { name, type: "richText", required },
  lexicalHTMLField({ htmlFieldName: `${name}_html`, lexicalFieldName: name, converters }),
]
