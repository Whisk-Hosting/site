# Starting content and the site's own blocks

Whisk's content engine adds what is here once, when it first opens the site, and never over an
edit: a page whose address already has a page, a product page whose handle has one and a menu
someone has saved are left as the team made them. Each file is added on its own, so one that
cannot be added is named in the log and leaves the rest as they are.

```
pages/*.json            {title, path, searchTitle?, description?, noindex?, head?, image?, market?, layout}
product-pages/*.json    a shop's product pages: {handle, layout, searchTitle?, description?, canonical?}
<list>/*.json           an entry of a shared list (below), its file names sorting in the order shown
menus.json              {name?, header: [{label, url}], columns: [{heading, links: [{label, url}]}], note?,
                         productsTitle?, productsDescription?, categories?: [{handle, searchTitle?, description?}]}
media/…                 the files the rest names
blocks/<slug>.json      a block of the site's own (below)
```

A picture is `{"file": "media/team.jpg", "alt": "The team"}`, an entry of a shared list
`{"entry": "testimonials/jane"}` (its list and its file's name), and any rich-text field may be
given as `{"html": "<p>…</p>"}`; a `content` block's words as
`{"blockType": "content", "html": "<p>…</p>"}`. Words in HTML hold pictures,
`<img src="media/…" alt="…">` (in a `<figure>` with a `<figcaption>` for a caption), and
callouts, `<aside data-callout="note|tip|warning" data-title="…"><p>…</p></aside>`.

## A page's blocks

A page's `layout` is a list of blocks, each with its `blockType` and its fields. A link is
`{"label": "…", "url": "…"}`.

```
hero        heading, text, image, link
content     content (rich text)
media       image, caption, wide
columns     heading, items: [{heading, text, image, link}]
list        heading, intro, list (testimonials), show (all | picked), topic (only the entries with
            it), limit (12), and the entries picked under the list's own name:
            "testimonials": [{"entry": "testimonials/jane"}]
products    heading, show (latest | collection | category), handle, limit (8)
form        name, heading, fields: [{name, label, type (text | email | tel | textarea | checkbox),
            required}], submit (Send),
            thanks (Thanks, we'll be in touch.)
html        html
```

A product page's `layout` takes content, media, columns, list and html.

## Shared lists

Kept once and shown by `list` blocks, each entry a file in its list's folder:

```
testimonials    quote, name, role, picture, topic
people          name, role, picture, bio, email, phone, topic
faqs            question, answer (rich text), topic
locations       name, address, phone, email, hours, map, picture, topic
logos           name, picture, url, topic
```

## The site's own blocks

A block of the site's own is two files with the same slug (letters, digits and dashes, not a
built-in block's): its fields in `blocks/<slug>.json`, from which the editor builds its form,
and its look in `theme/blocks/<slug>.html`.

```json
{"label": "Pricing table", "fields": [
  {"name": "heading", "type": "text", "label": "Heading", "default": "Our prices"},
  {"name": "plans", "type": "rows", "label": "Plans", "fields": [
    {"name": "name", "type": "text", "label": "Name"},
    {"name": "price", "type": "number", "label": "Price"},
    {"name": "details", "type": "words", "label": "Details"},
    {"name": "photo", "type": "picture", "label": "Photo"},
    {"name": "button", "type": "link", "label": "Button"}
  ]}
]}
```

The types are text, textarea, words (rich text), picture, check, number, select (with
`"options": [{"label": "…", "value": "…"}]`), link (a label and an address), group and rows
(each with `"fields"` of its own). A field may give a `default`. The engine checks every file
and will not open a site whose block file it cannot read, saying which and why.
