// What the editor's dashboard and enquiries list show: who sent an entry and how to reach them,
// in the words of the form it came from. Pure; test/admin.test.ts.

export type Entry = { id: number | string; form: string; page: string | null; data: Record<string, unknown>; created_at: string | Date }
type FormField = { name?: string; label?: string; type?: string; group?: string | null }

// Each form's field names in words, from every form block on the site's pages: "First name" for a
// field labelled First in the group Name.
export const fieldLabels = (pages: unknown[]): Map<string, Map<string, string>> => {
  const out = new Map<string, Map<string, string>>()
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) return x.forEach(walk)
    if (!x || typeof x !== "object") return
    const o = x as Record<string, unknown>
    if (o.blockType === "form" && typeof o.name === "string" && Array.isArray(o.fields)) {
      const labels = out.get(o.name) ?? new Map<string, string>()
      for (const f of o.fields as FormField[]) {
        if (!f.name) continue
        const label = f.label?.trim() || f.name
        labels.set(f.name, f.group?.trim() ? `${label} ${f.group.trim().toLowerCase()}` : label)
      }
      out.set(o.name, labels)
    }
    Object.values(o).forEach(walk)
  }
  walk(pages)
  return out
}

const text = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v)).trim()

// An entry's fields in the form's order where it knows them, then any others, with empty ones left out.
export const fieldsOf = (e: Entry, labels: Map<string, Map<string, string>>): { label: string; value: string }[] => {
  const known = labels.get(e.form) ?? new Map<string, string>()
  const names = [...known.keys()].filter((n) => n in e.data).concat(Object.keys(e.data).filter((n) => !known.has(n)))
  return names.map((n) => ({ label: known.get(n) ?? n, value: text(e.data[n]) })).filter((f) => f.value)
}

// Who sent it (their name, or their email), and how to reach them (email, then phone).
export const senderOf = (e: Entry, labels: Map<string, Map<string, string>>): { who: string; email?: string; phone?: string } => {
  const fields = fieldsOf(e, labels)
  const email = fields.find((f) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value))?.value
  const phone = fields.find((f) => /phone|mobile/i.test(f.label) && /\d{5,}/.test(f.value.replace(/\D/g, "")))?.value
  const names = fields.filter((f) => /name/i.test(f.label) && !/company|business/i.test(f.label)).map((f) => f.value)
  return { who: names.join(" ") || email || phone || "Someone", ...(email ? { email } : {}), ...(phone ? { phone } : {}) }
}

// A form's name in words: contact-us is "Contact us".
export const formTitle = (name: string) => {
  const words = name.replace(/[-_]+/g, " ").trim()
  return words ? words[0].toUpperCase() + words.slice(1) : "Form"
}

// A time as the business reads it.
export const when = (t: string | Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(t))
