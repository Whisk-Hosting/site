import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
// A product page's search details (its Search fields) and a shop's lists in search results
// (Menu, Shop in search): the products list's title and description, and each category's.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms"."menus_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"handle" varchar NOT NULL,
  	"search_title" varchar,
  	"description" varchar
  );
  
  ALTER TABLE "cms"."product_pages" ADD COLUMN "search_title" varchar;
  ALTER TABLE "cms"."product_pages" ADD COLUMN "description" varchar;
  ALTER TABLE "cms"."product_pages" ADD COLUMN "canonical" varchar;
  ALTER TABLE "cms"."_product_pages_v" ADD COLUMN "version_search_title" varchar;
  ALTER TABLE "cms"."_product_pages_v" ADD COLUMN "version_description" varchar;
  ALTER TABLE "cms"."_product_pages_v" ADD COLUMN "version_canonical" varchar;
  ALTER TABLE "cms"."menus" ADD COLUMN "products_title" varchar;
  ALTER TABLE "cms"."menus" ADD COLUMN "products_description" varchar;
  ALTER TABLE "cms"."menus_categories" ADD CONSTRAINT "menus_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."menus"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "menus_categories_order_idx" ON "cms"."menus_categories" USING btree ("_order");
  CREATE INDEX "menus_categories_parent_id_idx" ON "cms"."menus_categories" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."menus_categories" CASCADE;
  ALTER TABLE "cms"."product_pages" DROP COLUMN "search_title";
  ALTER TABLE "cms"."product_pages" DROP COLUMN "description";
  ALTER TABLE "cms"."product_pages" DROP COLUMN "canonical";
  ALTER TABLE "cms"."_product_pages_v" DROP COLUMN "version_search_title";
  ALTER TABLE "cms"."_product_pages_v" DROP COLUMN "version_description";
  ALTER TABLE "cms"."_product_pages_v" DROP COLUMN "version_canonical";
  ALTER TABLE "cms"."menus" DROP COLUMN "products_title";
  ALTER TABLE "cms"."menus" DROP COLUMN "products_description";`)
}
