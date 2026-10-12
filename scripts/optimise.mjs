// After the build (scripts/site.mjs): every font cut down to the letters the site can use, a WebP
// beside every large PNG and JPEG, and Brotli and gzip copies of every text file in the
// storefront's built files (storefront/dist/client), so server.mjs sends the smallest form a
// browser accepts without changing a single address or tag in the pages. Pages are drawn as they
// are asked for, from the CMS, so a font keeps the letters the built pages, the starting content
// (cms/content) and the set below use, and every private-use glyph (an icon font's), so words the
// team adds later still draw in the site's own type.
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import sharp from "sharp";
import subsetFont from "subset-font";

const app = join(import.meta.dirname, "..");
const root = join(app, "storefront", "dist", "client");
const server = join(app, "storefront", "dist", "server");
const content = join(app, "cms", "content");
const TEXT = new Set([".html", ".css", ".js", ".mjs", ".json", ".xml", ".txt", ".svg", ".ico", ".map", ".webmanifest"]);
const PHOTO = new Set([".png", ".jpg", ".jpeg"]);
const MIN_TEXT = 1024;
const MIN_PHOTO = 10 * 1024;
const FONT = new Map([[".woff2", "woff2"], [".woff", "woff"], [".ttf", "sfnt"], [".otf", "sfnt"]]);
// Kept in every font whatever the pages say, so text a page fills in as it runs (a name with a
// macron, a curly quote, a euro sign) never falls back to another typeface: printable ASCII,
// Latin-1, the Māori macrons and common punctuation. Each build cuts the fonts again, so text
// added to the pages later is covered by the next deploy.
const ALWAYS = [[0x20, 0x7e], [0xa0, 0xff], [0x2010, 0x2027], [0x2030, 0x203a], [0x20ac, 0x20ac], [0x2122, 0x2122]]
  .flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)))
  .join("") + "ĀāĒēĪīŌōŪū" + Array.from({ length: 0xf8ff - 0xe000 + 1 }, (_, i) => String.fromCodePoint(0xe000 + i)).join("");
// The OpenType features a browser applies to text on its own (kerning, ligatures, accents);
// features a stylesheet asks for by name are kept too (see `featuresIn`).
const BROWSER_FEATURES = ["calt", "ccmp", "clig", "curs", "dnom", "frac", "kern", "liga", "locl", "mark", "mkmk", "numr", "rlig", "rvrn"];
const VARIANT_FEATURES = new Map(Object.entries({
  "small-caps": ["smcp"], "all-small-caps": ["smcp", "c2sc"], "petite-caps": ["pcap"], "all-petite-caps": ["pcap", "c2pc"],
  "unicase": ["unic"], "titling-caps": ["titl"], "lining-nums": ["lnum"], "oldstyle-nums": ["onum"],
  "proportional-nums": ["pnum"], "tabular-nums": ["tnum"], "diagonal-fractions": ["frac"], "stacked-fractions": ["afrc"],
  "ordinal": ["ordn"], "slashed-zero": ["zero"], "discretionary-ligatures": ["dlig"], "historical-ligatures": ["hlig"],
  "super": ["sups"], "sub": ["subs"],
}));

const walk = async (dir) =>
  (await Promise.all((await readdir(dir, { withFileTypes: true }).catch(() => [])).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat();

/** Writes `file.br` and `file.gz` when each is smaller than the file. */
const compress = async (file) => {
  const body = await readFile(file);
  if (body.length < MIN_TEXT) return 0;
  const br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: body.length } });
  const gz = gzipSync(body, { level: 9 });
  if (br.length < body.length) await writeFile(`${file}.br`, br);
  if (gz.length < body.length) await writeFile(`${file}.gz`, gz);
  return body.length - br.length;
};

const char = (n) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "");

/** Every character a built file can draw: its own text, with HTML character references, CSS
 * escapes (an icon font's `content: "\f101"`) and JavaScript `\u` escapes decoded. */
const charactersIn = (text) =>
  text
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => char(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => char(Number(d)))
    .replace(/\\u\{?([0-9a-f]{4,6})\}?/gi, (_, h) => char(parseInt(h, 16)))
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => char(parseInt(h, 16)));

/** The OpenType features a stylesheet asks for: tags in `font-feature-settings` and the
 * keywords of `font-variant` and its longhands. */
const featuresIn = (css) => [
  ...[...css.matchAll(/font-feature-settings\s*:([^;}]*)/gi)].flatMap((m) => [...m[1].matchAll(/["']([\x20-\x7e]{4})["']/g)].map((t) => t[1])),
  ...[...css.matchAll(/font-variant[a-z-]*\s*:([^;}]*)/gi)].flatMap((m) => m[1].trim().split(/\s+/).flatMap((k) => VARIANT_FEATURES.get(k.toLowerCase()) ?? [])),
];

/** Rewrites a font with only the glyphs for `text`, when that is smaller. A font that fails to
 * subset stays as it is. The layout features in `keep` stay, so text sets the same. */
const subset = async (file, text, keep) => {
  const body = await readFile(file);
  const out = await subsetFont(body, text, { targetFormat: FONT.get(extname(file).toLowerCase()), keepFeatures: keep }).catch(() => undefined);
  if (!out || out.length >= body.length) return 0;
  await writeFile(file, out);
  return body.length - out.length;
};

/** Writes `photo.jpg.webp` when it is at least 10% smaller; the original stays for old browsers.
 * A PNG (often a logo or an icon) tries lossless first, so its edges stay exact. */
const webp = async (file) => {
  const size = (await stat(file)).size;
  if (size < MIN_PHOTO) return 0;
  const encode = (opts) => sharp(file, { animated: false }).webp(opts).toBuffer().catch(() => undefined);
  const png = extname(file).toLowerCase() === ".png";
  const tries = png ? [{ lossless: true, effort: 5 }, { quality: 90, alphaQuality: 100, effort: 5 }] : [{ quality: 82, effort: 5 }];
  for (const opts of tries) {
    const out = await encode(opts);
    if (out && out.length <= size * 0.9) {
      await writeFile(`${file}.webp`, out);
      return size - out.length;
    }
  }
  return 0;
};

const files = await walk(root);
const saved = { text: 0, images: 0, fonts: 0 };
const elsewhere = [...(await walk(server)), ...(await walk(content))].filter((f) => TEXT.has(extname(f).toLowerCase()));
const texts = await Promise.all([...files.filter((f) => TEXT.has(extname(f).toLowerCase())), ...elsewhere].map((f) => readFile(f, "utf8")));
const drawn = [...new Set([...ALWAYS, ...texts.flatMap((t) => Array.from(charactersIn(t)))])].join("");
const keep = [...new Set([...BROWSER_FEATURES, ...texts.flatMap(featuresIn)])];
for (const f of files.filter((f) => FONT.has(extname(f).toLowerCase()))) saved.fonts += await subset(f, drawn, keep);
for (const f of files) {
  const ext = extname(f).toLowerCase();
  if (TEXT.has(ext)) saved.text += await compress(f);
  else if (PHOTO.has(ext)) saved.images += await webp(f);
}
console.log(JSON.stringify({ level: "info", msg: "optimised", textSavedBytes: saved.text, imageSavedBytes: saved.images, fontSavedBytes: saved.fonts }));
