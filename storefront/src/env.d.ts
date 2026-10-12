/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    // Handed in by the server (server.mjs) on every request.
    site: { name: string; cms: string }
  }
}
