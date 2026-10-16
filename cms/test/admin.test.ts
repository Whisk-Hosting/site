// The dashboard's and enquiries list's words for a form entry (cms/src/admin/summary.ts).
import { test } from "node:test"
import assert from "node:assert/strict"
import { fieldLabels, fieldsOf, formTitle, senderOf, when, type Entry } from "../src/admin/summary"

const pages = [{ layout: [{ blockType: "section", blocks: [{ blockType: "form", name: "contact-us", fields: [
  { name: "input_1.3", label: "First", group: "Name" },
  { name: "input_1.6", label: "Last", group: "Name" },
  { name: "input_5", label: "Email" },
  { name: "input_6", label: "Phone" },
  { name: "input_3", label: "Comments" },
] }] }] }]
const labels = fieldLabels(pages)
const entry = (data: Record<string, unknown>): Entry => ({ id: 1, form: "contact-us", page: "/contact-us/", data, created_at: "2026-10-16T01:00:00Z" })

test("a form's fields are named in words, a grouped one with its group", () => {
  assert.deepEqual([...labels.get("contact-us")!.values()], ["First name", "Last name", "Email", "Phone", "Comments"])
  assert.equal(fieldLabels([]).size, 0)
})

test("an entry shows who sent it and how to reach them", () => {
  const e = entry({ input_3: "Hi", "input_1.6": "Smith", "input_1.3": "Jo", input_5: "jo@example.nz", input_6: "021 555 1234", extra: "x" })
  assert.deepEqual(senderOf(e, labels), { who: "Jo Smith", email: "jo@example.nz", phone: "021 555 1234" })
  assert.deepEqual(fieldsOf(e, labels).map((f) => f.label), ["First name", "Last name", "Email", "Phone", "Comments", "extra"])
  assert.deepEqual(senderOf(entry({ input_5: "a@b.co" }), labels), { who: "a@b.co", email: "a@b.co" })
  assert.deepEqual(senderOf(entry({ input_3: "" }), labels), { who: "Someone" })
  assert.deepEqual(senderOf({ ...entry({ name: "Ann" }), form: "unknown" }, labels), { who: "Ann" })
})

test("a form's name and a time read as words", () => {
  assert.equal(formTitle("contact-us"), "Contact us")
  assert.equal(formTitle(""), "Form")
  assert.equal(when("2026-10-16T01:00:00Z", "Pacific/Auckland"), "16 Oct 2026, 2:00 pm")
})
