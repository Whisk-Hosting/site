<p align="center">
  <a href="https://whisk.run">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/whisk-hosting/cli/raw/main/.github/whisk-wordmark-light-ink.svg">
      <img alt="Whisk" src="https://github.com/whisk-hosting/cli/raw/main/.github/whisk-wordmark.svg" width="220">
    </picture>
  </a>
</p>

<h1 align="center">Website</h1>

<p align="center">
  <strong>A business website with its own editor, live on Whisk from one prompt.</strong>
</p>

<p align="center">
  <img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-14213d">
  <img alt="Astro" src="https://img.shields.io/badge/pages-Astro-14213d">
  <img alt="Payload" src="https://img.shields.io/badge/editor-Payload-14213d">
  <img alt="Node 24" src="https://img.shields.io/badge/node-24-14213d">
  <img alt="Any paid Whisk plan" src="https://img.shields.io/badge/runs%20on-any%20paid%20Whisk%20plan-e3a92b">
</p>

<p align="center">
  <a href="#put-it-live">Put it live</a> ·
  <a href="#what-you-get">What you get</a> ·
  <a href="#make-it-yours">Make it yours</a> ·
  <a href="#what-whisk-is">What Whisk is</a> ·
  <a href="#how-it-works">How it works</a>
</p>

<p align="center">
  <img alt="The website's home page" src=".github/home.webp" width="900">
</p>

## Put it live

Give your coding agent (Claude Code, Codex, Cursor, Gemini CLI or any other) this prompt:

> Read https://whisk.run/skill and install the Whisk CLI. Then, in a new empty folder, run
> `whisk init --template site` and `whisk deploy`, and give me the address the website is live
> at and the address of its editor.

Or run it yourself:

```sh
curl -fsSL https://whisk.run/install.sh | sh     # Windows: irm https://whisk.run/install.ps1 | iex
mkdir my-website && cd my-website
whisk login
whisk init --template site
whisk deploy
```

The website is live at `https://<app>--<business>.whisk.page` with a home page to change. Open
`/app` on it and sign in with your Whisk account to edit. It runs on any paid Whisk plan (it
needs about 300 MB of memory); the free app is too small for it.

## What you get

<p align="center">
  <img alt="Editing the home page, with the live preview beside it" src=".github/editor.webp" width="900">
</p>

- **An editor for the whole team** at `/app`. Everyone in the business signs in with their Whisk
  account, so there are no passwords to share and nobody to add twice.
- **Pages built from blocks**: hero, text, picture, columns, form and HTML, in any order, at any
  address.
- **A live preview** beside the editor that follows each change, drafts only the team can see,
  and every earlier version kept.
- **Menus, footer and site name** edited in the same place.
- **Forms** that save each entry in the website's own database, behind a bot check.
- **Search engines covered**: a title and description for each page, `sitemap.xml`,
  `robots.txt`, and old addresses sent to new ones in one hop.
- **Fast on a phone**: pages drawn on the server, fonts cut to the letters used, WebP pictures,
  Brotli text, and pages cached at the edge for five minutes.
- **Hosting handled by Whisk**: HTTPS, your own domain, nightly backups, logs and a move to
  another server by itself if one fails.
- **Ready to sell later**: the editor is the same as the [Whisk shop](https://github.com/whisk-hosting/shop)'s,
  file for file, so a website that starts selling becomes a shop and keeps every page, menu and
  picture.

<p align="center">
  <img alt="A page on a phone" src=".github/phone.webp" width="300">
</p>

## Make it yours

The live website is a plain, tidy start. Ask your agent for the rest, in the same folder:

> Restyle this website for my business, Maple Street Coffee, a café and roastery in Portland. Use
> warm colors and a serif for headings, add Menu, Catering and Visit pages with a catering enquiry
> form, then deploy it.

> Add a "Team" block with a photo, name and role for each person, so we can add people in the
> editor, then deploy it.

> Point www.example.com at this website.

Words, pictures and pages are changed in the editor by anyone on the team; the look and new kinds
of blocks are changed in the code, by the agent.

## What Whisk is

[Whisk](https://whisk.run) is hosting for business apps and websites built by AI coding agents.
The agent installs the `whisk` CLI, describes the app in `whisk.yaml` and runs `whisk deploy`;
Whisk supplies sign-in, a Postgres database, backups, storage, email, scheduled jobs and
security, so the agent writes only the app. This website is one of its starting points, with the
[shop](https://github.com/whisk-hosting/shop) and the starter apps in the
[CLI](https://github.com/whisk-hosting/cli).

## How it works

A business's website on Whisk, headless, in one app on one address. Astro draws every page from
[Payload](https://payloadcms.com), which holds the pages, the menus and the pictures and runs
beside it in the same app. The business's Whisk team edits the site at `/app` with their Whisk
sign-in; nobody has a password. It needs about 300 MB of memory.

A page is a list of blocks (hero, text, picture, columns, form, HTML) at an address; drafts are
seen only by the team, in a preview beside the editor that follows the edit. A form block posts
to `/forms/<name>`, kept in the database's `form_entries` table. A coding agent edits the pages
through Payload's API at `/cms/api` on the site's address, with its Whisk credential
(`Authorization: Bearer $WHISK_TOKEN`), as the person it works for; each version of a page
records who made it, as "Claude for Jane Doe" for an agent's change. Old addresses go in
`redirects.json` (`{"from": "/old", "to": "/new"}`, or `"status": 410` for a page that is gone),
other sitemap addresses in `sitemaps.json` (`["/sitemap_index.xml"]`), and a `robots.txt` beside
`whisk.yaml` is served as it is. Starting content goes in `cms/content/` and is added once, never
over an edit (`cms/src/content.ts` says how).

The look is `storefront/` (Astro): the frame (`src/layouts/Site.astro`), the blocks
(`src/blocks`, one per Payload block in `cms/src/blocks`) and `src/styles/site.css`. Change a block
in both places, then `cd cms && npx payload migrate:create <name>` for the database.

```
server.mjs                  the server: health, forms, the admin, the editor, redirects, files, pages
server/routes.mjs           what the server decides about each request
server/cms.mjs              starts Payload beside the server and passes /cms to it
migrate.mjs                 the migrate step: form_entries, then Payload's migrations
storefront/                 every page: the frame, the blocks, the sitemap and robots.txt
cms/                        Payload: pages, menus, media, its migrations
scripts/site.mjs            build, dev
scripts/optimise.mjs        fonts cut to the letters used, WebP pictures, Brotli and gzip copies
```

### Run it on your computer

`whisk dev` needs Docker with the compose plugin. It starts Postgres and a local edge, then runs
the site with the environment it has in production:

```
npm install
npm run build
whisk dev --as you@example.com --roles owner -- npm run start
```

These lines work the same in PowerShell, Command Prompt and a Unix shell. `whisk dev` runs the
migration (`node migrate.mjs`) first. Open http://127.0.0.1:3000 for the site and
http://127.0.0.1:3000/app for the editor. `npm run dev` instead runs the editor in development,
rebuilding as its files change.

### Check it

```
npm test
npm run typecheck
```

## Licence

MIT. The photographs in the screenshots are from [Unsplash](https://unsplash.com), and Maple
Street Coffee is made up.
