// Which app the editor is part of: a shop (templates/shop, whose server starts it with
// CMS_SHOP=1) or a website (templates/site). Its tables are the same in both, so a website that
// starts selling keeps every page, menu and picture; only what the editor offers differs.
export const inShop = (env: Record<string, string | undefined> = process.env) => env.CMS_SHOP === "1"
