// Who may do what in the CMS. Anyone may read what is published; the business's team (signed in
// through Whisk, src/collections/Users.ts) may read drafts and change everything.
import type { Access } from "payload"

export const staff: Access = ({ req }) => !!req.user

export const anyone: Access = () => true

// Published documents for everyone, drafts too for the team.
export const publishedOrStaff: Access = ({ req }) => (req.user ? true : { _status: { equals: "published" } })

export const nobody: Access = () => false
