import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
// The upload fields on every copy, so a laptop's migrations match production's. IF NOT EXISTS,
// because an app that added them by hand already has some.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."media" ADD COLUMN IF NOT EXISTS "whisk_id" varchar;
  ALTER TABLE "cms"."media" ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT '';
  ALTER TABLE "cms"."media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."media" DROP COLUMN IF EXISTS "whisk_id";
  ALTER TABLE "cms"."media" DROP COLUMN IF EXISTS "prefix";
  ALTER TABLE "cms"."media" DROP COLUMN IF EXISTS "_objectkey";`)
}
