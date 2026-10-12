// Which addresses a page may have. The server's own (the editor, its files, forms, the platform's)
// answer first, and in a shop so do the shop's pages and Medusa's (../src/lib/routes.ts), so a
// page there could never be seen.
import { inShop } from "./app"

const SERVER = /^\/(app|health|forms|cms|_next|_astro|\.whisk)(\/|$)/
const SHOP = /^\/(shop|products|categories|collections|cart|checkout|account|order|search|store|admin|auth|hooks|erp-link)(\/|$)/
const SHAPE = /^\/([A-Za-z0-9._~!$&'()*+,;=:@%-]+\/?)*$/

// pathProblem is why a page's address will not do, or null when it will.
export const pathProblem = (path: string, shop = inShop()): string | null => {
  if (!path.startsWith("/")) return "An address starts with /, such as /about/."
  if (path.includes("//") || path.includes("?") || path.includes("#") || !SHAPE.test(path)) return "An address is a path only, such as /about/ or /services/repairs."
  const p = path.toLowerCase()
  if (SERVER.test(p) || (shop && SHOP.test(p)) || path === "/sitemap.xml" || path === "/robots.txt") return `${path} belongs to the ${shop ? "shop" : "site"}. Choose another address.`
  return null
}

// The other form of an address, with or without its last slash, which a page answers by sending
// the visitor to the form it was given.
export const otherForm = (path: string) => (path === "/" ? null : path.endsWith("/") ? path.slice(0, -1) : `${path}/`)
