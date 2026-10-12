// Whisk for the CMS: who is signed in (CONTRACT.md §4) and the platform's uploads (§8), the same
// rules as the shop's own (../src/lib/staff.ts, ../src/lib/whisk.ts). Every call has a deadline.

export type Person = { id: string; email: string; name: string; audience: string; roles: string[] }

type HeaderSource = { get(name: string): string | null }

// The edge sets these on every request and strips any a browser sends, so they say who is here.
export const personFrom = (h: HeaderSource): Person => ({
  id: h.get("x-whisk-user-id") ?? "",
  email: (h.get("x-whisk-email") ?? "").toLowerCase(),
  name: h.get("x-whisk-name") ?? "",
  audience: h.get("x-whisk-audience") ?? "",
  roles: (h.get("x-whisk-roles") ?? "").split(",").map((r) => r.trim()).filter(Boolean),
})

// Who may edit the site: anyone on the business's team except a guest, as for the shop's admin.
export const isStaff = (p: Person) => p.audience === "team" && !!p.id && !!p.email && p.roles.some((r) => r !== "guest")

const platformUrl = () => (process.env.WHISK_QUEUE_URL ?? "").replace(/\/events$/, "")

const platformCall = async <T>(method: string, path: string, waitMs: number, body?: unknown): Promise<T> => {
  const res = await fetch(platformUrl() + path, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WHISK_SERVICE_TOKEN ?? ""}` },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(waitMs),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`)
  return (text ? JSON.parse(text) : undefined) as T
}

type Upload = { id: string; url: string; fields: Record<string, string> }

// uploadFile stores one public file through the platform's upload form and answers its id.
export const uploadFile = async (file: { filename: string; contentType: string; content: Buffer }): Promise<string> => {
  const form = await platformCall<Upload>("POST", "/uploads", 15_000, {
    filename: file.filename,
    content_type: file.contentType,
    max_bytes: Math.max(file.content.length, 1),
    visibility: "public",
  })
  const body = new FormData()
  for (const [k, v] of Object.entries(form.fields)) body.append(k, v)
  body.append("file", new Blob([new Uint8Array(file.content)], { type: file.contentType }), file.filename)
  const res = await fetch(form.url, { method: "POST", body, signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`upload ${file.filename}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  return form.id
}

// An app cannot delete an upload (only a person can), so a file the site no longer uses is made
// private: it stops being served.
export const hideUpload = (id: string) => platformCall("PATCH", `/uploads/${encodeURIComponent(id)}`, 15_000, { visibility: "private" })

// Pictures are served resized by the edge (/.whisk/img/<id>?w=…); anything else by its media
// address.
export const mediaPath = (id: string, mimeType: string) => `${mimeType.startsWith("image/") ? "/.whisk/img/" : "/.whisk/media/"}${id}`
