// The pictures and callouts in a page's words (src/richtext.ts) as HTML, and starting content's
// way of writing them (src/content.ts): a picture as <img src="media/…" alt="…">, in a <figure>
// with a <figcaption> for a caption, and a callout as <aside data-callout="tip" data-title="…">
// <p>…</p></aside>. `markInline` and `finishInline` turn those into the editor's own nodes around
// Payload's HTML import (src/import.ts). Pure.
import { randomBytes } from "node:crypto"
import { JSDOM } from "jsdom"

export const TONES = ["note", "tip", "warning"] as const
export type Tone = (typeof TONES)[number]

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// The width the text column shows a picture at; the edge resizes it (/.whisk/img/<id>?w=…).
const WIDTH = 800

export type MediaDoc = { url?: string | null; alt?: string | null; mimeType?: string | null; width?: number | null; height?: number | null; filename?: string | null }

/** A picture, video or file in the text as HTML. */
export const pictureHtml = (m: MediaDoc, caption?: string | null): string => {
  const url = m.url ?? ""
  if (!url) return ""
  const cap = caption?.trim() ? `<figcaption>${esc(caption.trim())}</figcaption>` : ""
  if (m.mimeType?.startsWith("video/")) return `<figure class="inline-picture"><video src="${esc(url)}" controls preload="metadata"></video>${cap}</figure>`
  if (!m.mimeType?.startsWith("image/")) return `<p><a href="${esc(url)}">${esc(m.alt || m.filename || "Download")}</a></p>`
  const base = url.split("?")[0]!
  const resized = url.includes("/.whisk/img/")
  const src = resized ? `${base}?w=${WIDTH}&format=auto` : url
  const srcset = resized ? ` srcset="${esc(`${base}?w=${WIDTH}&format=auto 1x, ${base}?w=${WIDTH * 2}&format=auto 2x`)}"` : ""
  const size = m.width && m.height ? ` width="${WIDTH}" height="${Math.round((WIDTH * m.height) / m.width)}"` : ""
  return `<figure class="inline-picture"><img src="${esc(src)}"${srcset} alt="${esc(m.alt ?? "")}"${size} loading="lazy" decoding="async">${cap}</figure>`
}

/** A callout as HTML: its paragraphs are the text's blank-line-separated parts. */
export const calloutHtml = (c: { tone?: string | null; title?: string | null; text?: string | null }): string => {
  const tone = (TONES as readonly string[]).includes(c.tone ?? "") ? c.tone : "note"
  const paras = (c.text ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return `<aside class="callout callout-${tone}" role="note">${c.title?.trim() ? `<p class="callout-title">${esc(c.title.trim())}</p>` : ""}${paras.map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}</aside>`
}

export type Marks = { readonly captions: readonly (string | undefined)[]; readonly callouts: readonly { tone: Tone; title: string; text: string }[] }

const MARK = "WHISKCALLOUT"

/** The HTML ready for Payload's import: each picture of the content folder named by its media id
 * (which the import reads as a picture node), standing on its own rather than inside a paragraph,
 * pictures with no id left out, and each callout a marked paragraph `finishInline` replaces. */
export const markInline = (html: string, ids: ReadonlyMap<string, number | string>): { html: string; marks: Marks } => {
  const doc = new JSDOM(`<!doctype html><body>${html}</body>`).window.document
  const callouts: { tone: Tone; title: string; text: string }[] = []
  for (const aside of [...doc.querySelectorAll("aside[data-callout]")]) {
    const tone = aside.getAttribute("data-callout") as Tone
    const paras = [...aside.querySelectorAll("p")].map((p) => p.textContent?.trim() ?? "").filter(Boolean)
    const text = paras.length ? paras.join("\n\n") : (aside.textContent ?? "").trim()
    const p = doc.createElement("p")
    p.textContent = `${MARK}${callouts.length}`
    callouts.push({ tone: TONES.includes(tone) ? tone : "note", title: aside.getAttribute("data-title")?.trim() ?? "", text })
    aside.replaceWith(p)
  }
  const captions: (string | undefined)[] = []
  for (const img of [...doc.querySelectorAll("img")]) {
    const id = ids.get(img.getAttribute("src") ?? "")
    const figure = img.closest("figure")
    if (id === undefined) {
      const parent = (figure ?? img).parentElement
      ;(figure ?? img).remove()
      if (parent && parent !== doc.body && !parent.textContent?.trim() && !parent.querySelector("img")) parent.remove()
      continue
    }
    const caption = figure?.querySelector("figcaption")?.textContent?.trim() || undefined
    const picture = doc.createElement("img")
    picture.setAttribute("data-lexical-upload-relation-to", "media")
    picture.setAttribute("data-lexical-upload-id", String(id))
    captions.push(caption)
    // On its own, after the paragraph (or other block) it stood in.
    let host: Element = figure ?? img
    while (host.parentElement && host.parentElement !== doc.body) host = host.parentElement
    if (host === (figure ?? img)) host.replaceWith(picture)
    else {
      ;(figure ?? img).remove()
      let after: Element = host
      while (after.nextElementSibling?.hasAttribute("data-lexical-upload-id")) after = after.nextElementSibling
      after.after(picture)
      if (!host.textContent?.trim() && !host.querySelector("img")) host.remove()
    }
  }
  return { html: doc.body.innerHTML, marks: { captions, callouts } }
}

type Node = { type?: string; children?: Node[]; [k: string]: unknown }

/** Payload's import of `markInline`'s HTML made whole: each picture with its id as the media's
 * own (a number where the database's ids are) and its caption, and each marked paragraph the
 * callout it stands for. */
export const finishInline = <T>(tree: T, marks: Marks, ids: ReadonlyMap<string, number | string>, newId = () => randomBytes(12).toString("hex")): T => {
  const byText = new Map([...ids.values()].map((v) => [String(v), v]))
  let picture = 0
  const fix = (n: Node): Node => {
    if (n.type === "upload") {
      const caption = marks.captions[picture++]
      return { ...n, value: byText.get(String(n.value)) ?? n.value, fields: { ...((n.fields as object) ?? {}), ...(caption ? { caption } : {}) } }
    }
    const only = n.type === "paragraph" && n.children?.length === 1 ? n.children[0] : undefined
    const m = only?.type === "text" ? new RegExp(`^${MARK}(\\d+)$`).exec(String(only.text).trim()) : null
    const callout = m ? marks.callouts[Number(m[1])] : undefined
    if (callout) return { type: "block", version: 2, format: "", fields: { id: newId(), blockName: "", blockType: "callout", ...callout } }
    return n.children ? { ...n, children: n.children.map(fix) } : n
  }
  const t = tree as { root?: Node }
  return (t.root ? { ...t, root: fix(t.root) } : tree) as T
}
