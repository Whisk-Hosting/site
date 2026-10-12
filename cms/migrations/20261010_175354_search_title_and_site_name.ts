import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages" ADD COLUMN "search_title" varchar;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_search_title" varchar;
  ALTER TABLE "cms"."menus" ADD COLUMN "name" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages" DROP COLUMN "search_title";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_search_title";
  ALTER TABLE "cms"."menus" DROP COLUMN "name";`)
}
