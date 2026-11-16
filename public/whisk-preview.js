// A preview page tells the editor beside it that it is ready, and reloads when the draft is saved,
// so the preview follows the edit. Loaded only on previews (theme/site.html).
(() => {
  const editor = window.parent !== window ? window.parent : window.opener
  if (!editor) return
  editor.postMessage({ type: "payload-live-preview", ready: true }, location.origin)
  addEventListener("message", (e) => {
    if (e.origin === location.origin && e.data && e.data.type === "payload-document-event") location.reload()
  })
})()
