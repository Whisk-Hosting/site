// The address of a page's preview beside the editor: the page itself, as the browser reaches the
// site, asking for the draft.
import type { PayloadRequest } from "payload"

export const originOf = (headers: { get(name: string): string | null }, fallback: string) => {
  const host = headers.get("x-forwarded-host") ?? headers.get("host")
  if (!host) return fallback
  const proto = (headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim()
  return `${proto}://${host}`
}

export const previewUrl = (req: PayloadRequest, path: string) =>
  `${originOf(req.headers, (process.env.WHISK_PUBLIC_URL ?? "").replace(/\/$/, ""))}${path}?preview=1`
