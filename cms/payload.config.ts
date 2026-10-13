// The CMS: Payload, holding the website's pages, menus and media. The storefront (Astro) draws
// every page from it, and in a shop from Medusa too; the team edits it at /cms, signed in through
// Whisk. It shares the app's database, in a schema of its own (cms), and runs beside the app's
// server, which starts it (a shop's src/lib/cms.ts, a website's server/cms.mjs), so the site and
// the editor are on one address. This folder is the same in templates/shop and templates/site.
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildConfig } from "payload"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor, LinkFeature } from "@payloadcms/richtext-lexical"
import { cloudStoragePlugin } from "@payloadcms/plugin-cloud-storage"
import sharp from "sharp"
import { Users } from "./src/collections/Users"
import { Media } from "./src/collections/Media"
import { Pages } from "./src/collections/Pages"
import { ProductPages } from "./src/collections/ProductPages"
import { Menus } from "./src/globals/Navigation"
import { importContent } from "./src/import"
import { keepingHrefs } from "./src/links"
import { platformUploads, poolFrom, publicUrlFrom, secretFrom } from "./src/settings"
import { whiskUploads } from "./src/uploads"

const dirname = path.dirname(fileURLToPath(import.meta.url))
const env = process.env

export default buildConfig({
  secret: secretFrom(env),
  serverURL: "",
  routes: { admin: "/cms", api: "/cms/api", graphQL: "/cms/graphql", graphQLPlayground: "/cms/graphql-playground" },
  graphQL: { disable: true },
  telemetry: false,
  admin: {
    user: Users.slug,
    dateFormat: "d MMMM yyyy, h:mm a",
    meta: { titleSuffix: " | Pages" },
    importMap: { baseDir: dirname },
    components: { providers: ["/src/admin/Framed#Framed"] },
    livePreview: {
      breakpoints: [
        { label: "Phone", name: "phone", width: 390, height: 844 },
        { label: "Desktop", name: "desktop", width: 1440, height: 900 },
      ],
    },
  },
  collections: [Pages, ProductPages, Media, Users],
  globals: [Menus],
  // Links keep the address written (src/links.ts says why).
  editor: lexicalEditor({ features: ({ defaultFeatures }) => defaultFeatures.map((f) => (f.key === "link" ? LinkFeature({ fields: keepingHrefs }) : f)) }),
  db: postgresAdapter({
    pool: { ...poolFrom(env.DATABASE_URL ?? "postgres://localhost/app"), max: 5, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 },
    schemaName: "cms",
    migrationDir: path.resolve(dirname, "migrations"),
    push: false,
  }),
  sharp,
  // The upload fields are declared everywhere, so a migration made on a laptop matches production.
  plugins: [
    cloudStoragePlugin({
      enabled: platformUploads(env),
      alwaysInsertFields: true,
      collections: { media: { adapter: whiskUploads, disableLocalStorage: true, disablePayloadAccessControl: true } },
    }),
  ],
  typescript: { outputFile: path.resolve(dirname, "src/payload-types.ts") },
  cors: [publicUrlFrom(env)],
  csrf: [publicUrlFrom(env)],
  onInit: async (payload) => {
    if (env.NEXT_PHASE === "phase-production-build") return
    await importContent(payload, path.resolve(dirname, "content")).catch((e: Error) =>
      payload.logger.error({ err: e, msg: "content: the starting content could not all be added" }),
    )
  },
})
