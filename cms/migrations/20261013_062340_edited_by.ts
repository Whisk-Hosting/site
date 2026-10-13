import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
// Who made each change: the last editor on each page, product page and the menu, and on each
// page's versions. IF NOT EXISTS, so a copy that already has it migrates.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages" ADD COLUMN IF NOT EXISTS "edited_by" varchar;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN IF NOT EXISTS "version_edited_by" varchar;
  ALTER TABLE "cms"."product_pages" ADD COLUMN IF NOT EXISTS "edited_by" varchar;
  ALTER TABLE "cms"."_product_pages_v" ADD COLUMN IF NOT EXISTS "version_edited_by" varchar;
  ALTER TABLE "cms"."menus" ADD COLUMN IF NOT EXISTS "edited_by" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages" DROP COLUMN IF EXISTS "edited_by";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN IF EXISTS "version_edited_by";
  ALTER TABLE "cms"."product_pages" DROP COLUMN IF EXISTS "edited_by";
  ALTER TABLE "cms"."_product_pages_v" DROP COLUMN IF EXISTS "version_edited_by";
  ALTER TABLE "cms"."menus" DROP COLUMN IF EXISTS "edited_by";`)
}
