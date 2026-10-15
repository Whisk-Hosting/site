// Which app the editor is part of: a shop (templates/shop, whose server starts it with
// CMS_SHOP=1) or a website (templates/site). Its tables are the same in both, so a website that
// starts selling keeps every page, menu and picture; only what the editor offers differs.
export const inShop = (env: Record<string, string | undefined> = process.env) => env.CMS_SHOP === "1"

// The markets a shop sells in, one site each (SHOP_MARKETS, ../src/lib/market.ts): a page can be
// given to one of them. Empty for a website and for a shop that sells in one market.
// Every market's option is in the database's list whatever the shop sells in, so the tables are
// the same in every copy; the field is shown only in a shop with more than one.
export const MARKET_OPTIONS = [
  { label: "New Zealand", value: "nz" },
  { label: "Australia", value: "au" },
]
export const markets = (env: Record<string, string | undefined> = process.env): string[] => {
  const keys = (env.SHOP_MARKETS ?? "").split(",").map((e) => e.split("=")[0].trim().toLowerCase())
  return MARKET_OPTIONS.map((o) => o.value).filter((k) => keys.includes(k))
}
