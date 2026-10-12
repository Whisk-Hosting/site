"use client"
// Marks the editor when it is shown inside a shop's admin (an iframe at /app/pages and beside it),
// which has its own menu, account and sign-in, so custom.css hides the editor's own there. On its
// own, as a website's admin, the editor keeps them. The mark is set as the page is read, before
// it is first drawn.
import type { ReactNode } from "react"

// Plain text with no character React would escape, so it runs as written.
const MARK = "if (window.parent !== window) document.documentElement.dataset.framed = 1"

export const Framed = ({ children }: { children: ReactNode }) => (
  <>
    <script>{MARK}</script>
    {children}
  </>
)
