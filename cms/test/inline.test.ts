// Pictures and callouts in a page's words (src/inline.ts), and starting content naming them.
import { test } from "node:test"
import assert from "node:assert/strict"
import { calloutHtml, finishInline, markInline, pictureHtml } from "../src/inline"
import { fileRefs, inlineFiles, resolved } from "../src/content"

test("starting content's pictures in the words are added as files", () => {
  const html = `<p>Our van <img src="media/van.jpg" alt="The van"> and <img src="https://cdn.example/x.png"></p><figure><img src="media/yard.png"><figcaption>The yard</figcaption></figure>`
  assert.deepEqual(inlineFiles(html), [{ file: "media/van.jpg", alt: "The van" }, { file: "media/yard.png", alt: "" }])
  assert.deepEqual(fileRefs({ layout: [{ blockType: "content", html }] }).map((r) => r.file), ["media/van.jpg", "media/yard.png"])
  const ids = new Map<string, number>([["media/van.jpg", 3]])
  const out = resolved({ layout: [{ blockType: "content", html }] }, ids, (h, i) => ({ h, n: i.size })) as any
  assert.deepEqual(out.layout[0].content, { h: html, n: 1 }, "the words are given the files' ids")
})

test("markInline stands each picture on its own, names it by id, and marks callouts", () => {
  const ids = new Map<string, number>([["media/van.jpg", 3], ["media/yard.png", 7]])
  const { html, marks } = markInline(
    `<p>Our van <img src="media/van.jpg" alt="The van"> is new.</p><figure><img src="media/yard.png"><figcaption> The yard </figcaption></figure><p><img src="media/gone.jpg"></p><aside data-callout="tip" data-title="Good to know"><p>Book early.</p><p>Weekends fill.</p></aside><aside data-callout="loud">Plain words</aside>`,
    ids,
  )
  assert.equal(
    html,
    `<p>Our van  is new.</p><img data-lexical-upload-relation-to="media" data-lexical-upload-id="3"><img data-lexical-upload-relation-to="media" data-lexical-upload-id="7"><p>WHISKCALLOUT0</p><p>WHISKCALLOUT1</p>`,
  )
  assert.deepEqual(marks, {
    captions: [undefined, "The yard"],
    callouts: [
      { tone: "tip", title: "Good to know", text: "Book early.\n\nWeekends fill." },
      { tone: "note", title: "", text: "Plain words" },
    ],
  })
})

test("finishInline gives pictures their ids and captions, and puts the callouts in", () => {
  const ids = new Map<string, number>([["media/van.jpg", 3], ["media/yard.png", 7]])
  const marks = { captions: [undefined, "The yard"], callouts: [{ tone: "tip" as const, title: "T", text: "Words" }] }
  const tree = {
    root: {
      type: "root",
      children: [
        { type: "upload", relationTo: "media", value: "3", fields: {} },
        { type: "upload", relationTo: "media", value: "7", fields: {} },
        { type: "paragraph", children: [{ type: "text", text: "WHISKCALLOUT0" }] },
        { type: "paragraph", children: [{ type: "text", text: "WHISKCALLOUT0 and more" }] },
      ],
    },
  }
  const out = finishInline(tree, marks, ids, () => "b1")
  assert.deepEqual(out.root.children, [
    { type: "upload", relationTo: "media", value: 3, fields: {} },
    { type: "upload", relationTo: "media", value: 7, fields: { caption: "The yard" } },
    { type: "block", version: 2, format: "", fields: { id: "b1", blockName: "", blockType: "callout", tone: "tip", title: "T", text: "Words" } },
    tree.root.children[3],
  ])
})

test("pictures and callouts are drawn as HTML", () => {
  assert.equal(
    pictureHtml({ url: "/.whisk/img/9?v=1", alt: 'A "van"', mimeType: "image/jpeg", width: 1600, height: 900 }, "Ours"),
    `<figure class="inline-picture"><img src="/.whisk/img/9?w=800&amp;format=auto" srcset="/.whisk/img/9?w=800&amp;format=auto 1x, /.whisk/img/9?w=1600&amp;format=auto 2x" alt="A &quot;van&quot;" width="800" height="450" loading="lazy" decoding="async"><figcaption>Ours</figcaption></figure>`,
  )
  assert.equal(pictureHtml({ url: "/cms/api/media/file/a.png", alt: "", mimeType: "image/png" }), `<figure class="inline-picture"><img src="/cms/api/media/file/a.png" alt="" loading="lazy" decoding="async"></figure>`)
  assert.equal(pictureHtml({ url: "/f.pdf", alt: "Price list", mimeType: "application/pdf" }), `<p><a href="/f.pdf">Price list</a></p>`)
  assert.equal(pictureHtml({ url: null }), "")
  assert.equal(calloutHtml({ tone: "warning", title: "Mind <this>", text: "One\nline\n\nTwo" }), `<aside class="callout callout-warning" role="note"><p class="callout-title">Mind &lt;this&gt;</p><p>One<br>line</p><p>Two</p></aside>`)
  assert.equal(calloutHtml({ tone: "odd", text: "x" }), `<aside class="callout callout-note" role="note"><p>x</p></aside>`)
})
