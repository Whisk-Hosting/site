import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
// A page can be for one market's site (pages.market): an address is then one page per site, with
// a page for every site (market empty) beside each market's own.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_pages_market" AS ENUM('nz', 'au');
  CREATE TYPE "cms"."enum__pages_v_version_market" AS ENUM('nz', 'au');
  DROP INDEX "cms"."pages_path_idx";
  ALTER TABLE "cms"."pages" ADD COLUMN "market" "cms"."enum_pages_market";
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_market" "cms"."enum__pages_v_version_market";
  CREATE UNIQUE INDEX "path_market_idx" ON "cms"."pages" USING btree ("path","market");
  CREATE INDEX "version_path_version_market_idx" ON "cms"."_pages_v" USING btree ("version_path","version_market");
  CREATE INDEX "pages_path_idx" ON "cms"."pages" USING btree ("path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms"."path_market_idx";
  DROP INDEX "cms"."version_path_version_market_idx";
  DROP INDEX "cms"."pages_path_idx";
  CREATE UNIQUE INDEX "pages_path_idx" ON "cms"."pages" USING btree ("path");
  ALTER TABLE "cms"."pages" DROP COLUMN "market";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_market";
  DROP TYPE "cms"."enum_pages_market";
  DROP TYPE "cms"."enum__pages_v_version_market";`)
}
