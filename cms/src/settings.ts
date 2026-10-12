// Pure decisions about how the CMS runs, from its environment. payload.config.ts calls these and
// test/settings.test.ts table-tests them; nothing here reads the process or the network.
import { createHmac } from "node:crypto"

export type Env = Record<string, string | undefined>

// The platform's DATABASE_URL ends in sslmode=require, which in libpq means "encrypt, but do not
// check the certificate" (CONTRACT.md §5). node-postgres reads require as verify-full, so the mode
// is taken off the address and handed to the driver as what libpq means by it. The same as the
// shop's own (../src/lib/settings.ts).
export type Pool = { connectionString: string; ssl: false | { rejectUnauthorized: boolean } }

const NO_VERIFY = new Set(["require", "prefer", "allow"])

export const poolFrom = (raw: string): Pool => {
  const url = new URL(raw)
  const mode = url.searchParams.get("sslmode") ?? ""
  url.searchParams.delete("sslmode")
  if (mode === "disable" || mode === "") return { connectionString: url.toString(), ssl: false }
  // nosemgrep: problem-based-packs.insecure-transport.js-node.bypass-tls-verification.bypass-tls-verification -- libpq's sslmode=require, as the platform's DATABASE_URL asks (CONTRACT.md §5)
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: !NO_VERIFY.has(mode) } }
}

// Payload signs its tokens with a secret. Like the shop's, it is derived from WHISK_DELIVERY_KEY
// under a label of its own, so nobody sets it. A build, the migrate step and a laptop sign nothing
// that matters and use a fixed value; a server without the key stops.
export const secretFrom = (env: Env): string => {
  const key = Buffer.from(env.WHISK_DELIVERY_KEY ?? "", "base64")
  if (key.length >= 32) return createHmac("sha256", key).update("whisk:cms").digest("hex")
  const building = env.NEXT_PHASE === "phase-production-build" || env.CMS_STEP === "migrate" || env.PAYLOAD_MIGRATING === "true"
  if (building || env.WHISK_DEV === "1" || env.NODE_ENV !== "production") return "development-only"
  throw new Error("WHISK_DELIVERY_KEY is missing: the CMS derives its secret from it.")
}

// Uploads go through the platform when the app runs on Whisk (a service token and its address),
// so each is virus-scanned and served resized by the edge; on a laptop they stay in cms/media.
export const platformUploads = (env: Env): boolean => !!env.WHISK_SERVICE_TOKEN && !!env.WHISK_QUEUE_URL

// The address people reach the site at, for the editor's preview.
export const publicUrlFrom = (env: Env): string => (env.WHISK_PUBLIC_URL ?? "http://localhost:9000").replace(/\/$/, "")
