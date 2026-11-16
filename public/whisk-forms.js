// Forms post to /forms/<name>, which Whisk's edge guards with a proof-of-work challenge (Altcha,
// contract/errors.md CHALLENGE_REQUIRED): before a form is sent, ask the edge for a challenge,
// solve it, and send the answer in the `altcha` field. The visitor sees only a moment's wait.
// Loaded by every page (src/layouts/Shop.astro).
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement) || form.dataset.solved) return;
  if (!new URL(form.action, location.href).pathname.startsWith("/forms/")) return;
  e.preventDefault();
  const buttons = [...form.querySelectorAll('[type="submit"], button:not([type])')];
  buttons.forEach((b) => (b.disabled = true));
  try {
    const res = await fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: new URLSearchParams(), credentials: "same-origin" });
    const ch = (await res.json().catch(() => ({})))?.error?.details?.challenge;
    if (ch) {
      const enc = new TextEncoder();
      const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      for (let n = 0; n <= ch.maxnumber; n++) {
        if (hex(await crypto.subtle.digest("SHA-256", enc.encode(ch.salt + n))) !== ch.challenge) continue;
        const field = document.createElement("input");
        field.type = "hidden";
        field.name = "altcha";
        field.value = btoa(JSON.stringify({ algorithm: ch.algorithm, challenge: ch.challenge, number: n, salt: ch.salt, signature: ch.signature }));
        form.append(field);
        break;
      }
    }
  } catch {
    // Sent as is: the edge answers with its own challenge page.
  }
  form.dataset.solved = "1";
  buttons.forEach((b) => (b.disabled = false));
  form.submit();
});
