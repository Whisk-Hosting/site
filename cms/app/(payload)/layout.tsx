// The editor's frame, as Payload makes it.
import config from "@payload-config"
import "@payloadcms/next/css"
import type { ServerFunctionClient } from "payload"
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts"
import type React from "react"
import { importMap } from "./cms/importMap.js"
import "./custom.css"

const serverFunction: ServerFunctionClient = async function (args) {
  "use server"
  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
