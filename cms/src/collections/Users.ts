// The people who edit the site: the business's own Whisk team. Nobody has a password here. Whisk's
// edge says who is signed in (src/whisk.ts), and a team member is given a user the first time they
// open /cms, kept up to date with their name and email. An agent acting for a person signs in as
// that person's user, with the agent beside it for the request (src/edited.ts records both).
import type { AuthStrategy, CollectionConfig, Payload } from "payload"
import { isStaff, personFrom, type Person } from "../whisk"
import { nobody, staff } from "../access"

const userFor = async (payload: Payload, p: Person) => {
  const find = async () =>
    (await payload.find({ collection: "users", where: { whiskUserId: { equals: p.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const found = await find()
  if (!found) {
    // Two first requests at once both try; the second finds the first's.
    return payload
      .create({ collection: "users", data: { email: p.email, name: p.name, whiskUserId: p.id }, overrideAccess: true })
      .catch(async (e) => (await find()) ?? Promise.reject(e))
  }
  if (found.email === p.email && found.name === p.name) return found
  return payload.update({ collection: "users", id: found.id, data: { email: p.email, name: p.name }, overrideAccess: true })
}

export const whiskSignIn: AuthStrategy = {
  name: "whisk",
  authenticate: async ({ headers, payload }) => {
    const p = personFrom(headers)
    if (!isStaff(p)) return { user: null }
    const user = await userFor(payload, p)
    return { user: { ...user, agent: p.agent, collection: "users", _strategy: "whisk" } }
  },
}

export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Editor", plural: "Editors" },
  admin: { useAsTitle: "name", defaultColumns: ["name", "email", "updatedAt"], group: "Settings" },
  auth: { disableLocalStrategy: true, strategies: [whiskSignIn] },
  access: { read: staff, create: nobody, update: nobody, delete: staff },
  fields: [
    { name: "name", type: "text" },
    { name: "email", type: "email", required: true, unique: true },
    { name: "whiskUserId", type: "text", required: true, unique: true, index: true, admin: { readOnly: true } },
  ],
}
