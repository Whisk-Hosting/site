// Who made each change to the site's content. The pages, product pages and menu keep the last
// one in a field of their own, and a page's versions copy it, so each version says who made it.
import type { Field } from "payload"
import type { Agent } from "./whisk"

export type Editor = { name?: string | null; email?: string | null; agent?: Agent | null }

// The person's name, or their email when they have none; an agent's change is "<agent> for
// <person>". Nothing when nobody is signed in (the starting content, a migration).
export const editorName = (user: Editor | null | undefined): string | undefined => {
  if (!user) return undefined
  const person = user.name?.trim() || user.email?.trim() || ""
  if (!user.agent) return person || undefined
  return person ? `${user.agent.name} for ${person}` : user.agent.name
}

export const editedBy: Field = {
  name: "editedBy",
  label: "Last edited by",
  type: "text",
  admin: { readOnly: true, position: "sidebar" },
  hooks: { beforeChange: [({ req, value }) => editorName(req.user as Editor | null) ?? value] },
}
