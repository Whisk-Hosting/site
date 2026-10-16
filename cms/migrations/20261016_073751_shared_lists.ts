import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_pages_blocks_list_list" AS ENUM('testimonials', 'people', 'faqs', 'locations', 'logos');
  CREATE TYPE "cms"."enum_pages_blocks_list_show" AS ENUM('all', 'picked');
  CREATE TYPE "cms"."enum__pages_v_blocks_list_list" AS ENUM('testimonials', 'people', 'faqs', 'locations', 'logos');
  CREATE TYPE "cms"."enum__pages_v_blocks_list_show" AS ENUM('all', 'picked');
  CREATE TYPE "cms"."enum_product_pages_blocks_list_list" AS ENUM('testimonials', 'people', 'faqs', 'locations', 'logos');
  CREATE TYPE "cms"."enum_product_pages_blocks_list_show" AS ENUM('all', 'picked');
  CREATE TYPE "cms"."enum__product_pages_v_blocks_list_list" AS ENUM('testimonials', 'people', 'faqs', 'locations', 'logos');
  CREATE TYPE "cms"."enum__product_pages_v_blocks_list_show" AS ENUM('all', 'picked');
  CREATE TABLE "cms"."pages_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"list" "cms"."enum_pages_blocks_list_list" DEFAULT 'testimonials',
  	"show" "cms"."enum_pages_blocks_list_show" DEFAULT 'all',
  	"topic" varchar,
  	"limit" numeric DEFAULT 12,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer,
  	"people_id" integer,
  	"faqs_id" integer,
  	"locations_id" integer,
  	"logos_id" integer
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"list" "cms"."enum__pages_v_blocks_list_list" DEFAULT 'testimonials',
  	"show" "cms"."enum__pages_v_blocks_list_show" DEFAULT 'all',
  	"topic" varchar,
  	"limit" numeric DEFAULT 12,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer,
  	"people_id" integer,
  	"faqs_id" integer,
  	"locations_id" integer,
  	"logos_id" integer
  );
  
  CREATE TABLE "cms"."product_pages_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"list" "cms"."enum_product_pages_blocks_list_list" DEFAULT 'testimonials',
  	"show" "cms"."enum_product_pages_blocks_list_show" DEFAULT 'all',
  	"topic" varchar,
  	"limit" numeric DEFAULT 12,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."product_pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer,
  	"people_id" integer,
  	"faqs_id" integer,
  	"locations_id" integer,
  	"logos_id" integer
  );
  
  CREATE TABLE "cms"."_product_pages_v_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"list" "cms"."enum__product_pages_v_blocks_list_list" DEFAULT 'testimonials',
  	"show" "cms"."enum__product_pages_v_blocks_list_show" DEFAULT 'all',
  	"topic" varchar,
  	"limit" numeric DEFAULT 12,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_product_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer,
  	"people_id" integer,
  	"faqs_id" integer,
  	"locations_id" integer,
  	"logos_id" integer
  );
  
  CREATE TABLE "cms"."testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"quote" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"picture_id" integer,
  	"topic" varchar,
  	"source" varchar,
  	"edited_by" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_testimonials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_quote" varchar NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_role" varchar,
  	"version_picture_id" integer,
  	"version_topic" varchar,
  	"version_source" varchar,
  	"version_edited_by" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"picture_id" integer,
  	"bio" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"topic" varchar,
  	"source" varchar,
  	"edited_by" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_people_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_name" varchar NOT NULL,
  	"version_role" varchar,
  	"version_picture_id" integer,
  	"version_bio" varchar,
  	"version_email" varchar,
  	"version_phone" varchar,
  	"version_topic" varchar,
  	"version_source" varchar,
  	"version_edited_by" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL,
  	"answer_html" varchar,
  	"topic" varchar,
  	"source" varchar,
  	"edited_by" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_faqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_question" varchar NOT NULL,
  	"version_answer" jsonb NOT NULL,
  	"version_answer_html" varchar,
  	"version_topic" varchar,
  	"version_source" varchar,
  	"version_edited_by" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"name" varchar NOT NULL,
  	"address" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"hours" varchar,
  	"map" varchar,
  	"picture_id" integer,
  	"topic" varchar,
  	"source" varchar,
  	"edited_by" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_locations_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_name" varchar NOT NULL,
  	"version_address" varchar,
  	"version_phone" varchar,
  	"version_email" varchar,
  	"version_hours" varchar,
  	"version_map" varchar,
  	"version_picture_id" integer,
  	"version_topic" varchar,
  	"version_source" varchar,
  	"version_edited_by" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."logos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"name" varchar NOT NULL,
  	"picture_id" integer NOT NULL,
  	"url" varchar,
  	"topic" varchar,
  	"source" varchar,
  	"edited_by" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_logos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_name" varchar NOT NULL,
  	"version_picture_id" integer NOT NULL,
  	"version_url" varchar,
  	"version_topic" varchar,
  	"version_source" varchar,
  	"version_edited_by" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "people_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "faqs_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "locations_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "logos_id" integer;
  ALTER TABLE "cms"."pages_blocks_list" ADD CONSTRAINT "pages_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "cms"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "cms"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "cms"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_logos_fk" FOREIGN KEY ("logos_id") REFERENCES "cms"."logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_list" ADD CONSTRAINT "_pages_v_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "cms"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "cms"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "cms"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_logos_fk" FOREIGN KEY ("logos_id") REFERENCES "cms"."logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_list" ADD CONSTRAINT "product_pages_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."product_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_rels" ADD CONSTRAINT "product_pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."product_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_rels" ADD CONSTRAINT "product_pages_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "cms"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_rels" ADD CONSTRAINT "product_pages_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_rels" ADD CONSTRAINT "product_pages_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "cms"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_rels" ADD CONSTRAINT "product_pages_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "cms"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_rels" ADD CONSTRAINT "product_pages_rels_logos_fk" FOREIGN KEY ("logos_id") REFERENCES "cms"."logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_list" ADD CONSTRAINT "_product_pages_v_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_product_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_rels" ADD CONSTRAINT "_product_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_product_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_rels" ADD CONSTRAINT "_product_pages_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "cms"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_rels" ADD CONSTRAINT "_product_pages_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_rels" ADD CONSTRAINT "_product_pages_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "cms"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_rels" ADD CONSTRAINT "_product_pages_v_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "cms"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_rels" ADD CONSTRAINT "_product_pages_v_rels_logos_fk" FOREIGN KEY ("logos_id") REFERENCES "cms"."logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."testimonials" ADD CONSTRAINT "testimonials_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_testimonials_v" ADD CONSTRAINT "_testimonials_v_parent_id_testimonials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_picture_id_media_id_fk" FOREIGN KEY ("version_picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."people" ADD CONSTRAINT "people_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_people_v" ADD CONSTRAINT "_people_v_parent_id_people_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_people_v" ADD CONSTRAINT "_people_v_version_picture_id_media_id_fk" FOREIGN KEY ("version_picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_faqs_v" ADD CONSTRAINT "_faqs_v_parent_id_faqs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."faqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."locations" ADD CONSTRAINT "locations_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_locations_v" ADD CONSTRAINT "_locations_v_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_locations_v" ADD CONSTRAINT "_locations_v_version_picture_id_media_id_fk" FOREIGN KEY ("version_picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."logos" ADD CONSTRAINT "logos_picture_id_media_id_fk" FOREIGN KEY ("picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_logos_v" ADD CONSTRAINT "_logos_v_parent_id_logos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."logos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_logos_v" ADD CONSTRAINT "_logos_v_version_picture_id_media_id_fk" FOREIGN KEY ("version_picture_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_list_order_idx" ON "cms"."pages_blocks_list" USING btree ("_order");
  CREATE INDEX "pages_blocks_list_parent_id_idx" ON "cms"."pages_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_list_path_idx" ON "cms"."pages_blocks_list" USING btree ("_path");
  CREATE INDEX "pages_rels_order_idx" ON "cms"."pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "cms"."pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "cms"."pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_testimonials_id_idx" ON "cms"."pages_rels" USING btree ("testimonials_id");
  CREATE INDEX "pages_rels_people_id_idx" ON "cms"."pages_rels" USING btree ("people_id");
  CREATE INDEX "pages_rels_faqs_id_idx" ON "cms"."pages_rels" USING btree ("faqs_id");
  CREATE INDEX "pages_rels_locations_id_idx" ON "cms"."pages_rels" USING btree ("locations_id");
  CREATE INDEX "pages_rels_logos_id_idx" ON "cms"."pages_rels" USING btree ("logos_id");
  CREATE INDEX "_pages_v_blocks_list_order_idx" ON "cms"."_pages_v_blocks_list" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_list_parent_id_idx" ON "cms"."_pages_v_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_list_path_idx" ON "cms"."_pages_v_blocks_list" USING btree ("_path");
  CREATE INDEX "_pages_v_rels_order_idx" ON "cms"."_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "cms"."_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "cms"."_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_testimonials_id_idx" ON "cms"."_pages_v_rels" USING btree ("testimonials_id");
  CREATE INDEX "_pages_v_rels_people_id_idx" ON "cms"."_pages_v_rels" USING btree ("people_id");
  CREATE INDEX "_pages_v_rels_faqs_id_idx" ON "cms"."_pages_v_rels" USING btree ("faqs_id");
  CREATE INDEX "_pages_v_rels_locations_id_idx" ON "cms"."_pages_v_rels" USING btree ("locations_id");
  CREATE INDEX "_pages_v_rels_logos_id_idx" ON "cms"."_pages_v_rels" USING btree ("logos_id");
  CREATE INDEX "product_pages_blocks_list_order_idx" ON "cms"."product_pages_blocks_list" USING btree ("_order");
  CREATE INDEX "product_pages_blocks_list_parent_id_idx" ON "cms"."product_pages_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "product_pages_blocks_list_path_idx" ON "cms"."product_pages_blocks_list" USING btree ("_path");
  CREATE INDEX "product_pages_rels_order_idx" ON "cms"."product_pages_rels" USING btree ("order");
  CREATE INDEX "product_pages_rels_parent_idx" ON "cms"."product_pages_rels" USING btree ("parent_id");
  CREATE INDEX "product_pages_rels_path_idx" ON "cms"."product_pages_rels" USING btree ("path");
  CREATE INDEX "product_pages_rels_testimonials_id_idx" ON "cms"."product_pages_rels" USING btree ("testimonials_id");
  CREATE INDEX "product_pages_rels_people_id_idx" ON "cms"."product_pages_rels" USING btree ("people_id");
  CREATE INDEX "product_pages_rels_faqs_id_idx" ON "cms"."product_pages_rels" USING btree ("faqs_id");
  CREATE INDEX "product_pages_rels_locations_id_idx" ON "cms"."product_pages_rels" USING btree ("locations_id");
  CREATE INDEX "product_pages_rels_logos_id_idx" ON "cms"."product_pages_rels" USING btree ("logos_id");
  CREATE INDEX "_product_pages_v_blocks_list_order_idx" ON "cms"."_product_pages_v_blocks_list" USING btree ("_order");
  CREATE INDEX "_product_pages_v_blocks_list_parent_id_idx" ON "cms"."_product_pages_v_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "_product_pages_v_blocks_list_path_idx" ON "cms"."_product_pages_v_blocks_list" USING btree ("_path");
  CREATE INDEX "_product_pages_v_rels_order_idx" ON "cms"."_product_pages_v_rels" USING btree ("order");
  CREATE INDEX "_product_pages_v_rels_parent_idx" ON "cms"."_product_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_product_pages_v_rels_path_idx" ON "cms"."_product_pages_v_rels" USING btree ("path");
  CREATE INDEX "_product_pages_v_rels_testimonials_id_idx" ON "cms"."_product_pages_v_rels" USING btree ("testimonials_id");
  CREATE INDEX "_product_pages_v_rels_people_id_idx" ON "cms"."_product_pages_v_rels" USING btree ("people_id");
  CREATE INDEX "_product_pages_v_rels_faqs_id_idx" ON "cms"."_product_pages_v_rels" USING btree ("faqs_id");
  CREATE INDEX "_product_pages_v_rels_locations_id_idx" ON "cms"."_product_pages_v_rels" USING btree ("locations_id");
  CREATE INDEX "_product_pages_v_rels_logos_id_idx" ON "cms"."_product_pages_v_rels" USING btree ("logos_id");
  CREATE INDEX "testimonials__order_idx" ON "cms"."testimonials" USING btree ("_order");
  CREATE INDEX "testimonials_picture_idx" ON "cms"."testimonials" USING btree ("picture_id");
  CREATE INDEX "testimonials_topic_idx" ON "cms"."testimonials" USING btree ("topic");
  CREATE UNIQUE INDEX "testimonials_source_idx" ON "cms"."testimonials" USING btree ("source");
  CREATE INDEX "testimonials_updated_at_idx" ON "cms"."testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "cms"."testimonials" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_parent_idx" ON "cms"."_testimonials_v" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_version_version__order_idx" ON "cms"."_testimonials_v" USING btree ("version__order");
  CREATE INDEX "_testimonials_v_version_version_picture_idx" ON "cms"."_testimonials_v" USING btree ("version_picture_id");
  CREATE INDEX "_testimonials_v_version_version_topic_idx" ON "cms"."_testimonials_v" USING btree ("version_topic");
  CREATE INDEX "_testimonials_v_version_version_source_idx" ON "cms"."_testimonials_v" USING btree ("version_source");
  CREATE INDEX "_testimonials_v_version_version_updated_at_idx" ON "cms"."_testimonials_v" USING btree ("version_updated_at");
  CREATE INDEX "_testimonials_v_version_version_created_at_idx" ON "cms"."_testimonials_v" USING btree ("version_created_at");
  CREATE INDEX "_testimonials_v_created_at_idx" ON "cms"."_testimonials_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_updated_at_idx" ON "cms"."_testimonials_v" USING btree ("updated_at");
  CREATE INDEX "people__order_idx" ON "cms"."people" USING btree ("_order");
  CREATE INDEX "people_picture_idx" ON "cms"."people" USING btree ("picture_id");
  CREATE INDEX "people_topic_idx" ON "cms"."people" USING btree ("topic");
  CREATE UNIQUE INDEX "people_source_idx" ON "cms"."people" USING btree ("source");
  CREATE INDEX "people_updated_at_idx" ON "cms"."people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "cms"."people" USING btree ("created_at");
  CREATE INDEX "_people_v_parent_idx" ON "cms"."_people_v" USING btree ("parent_id");
  CREATE INDEX "_people_v_version_version__order_idx" ON "cms"."_people_v" USING btree ("version__order");
  CREATE INDEX "_people_v_version_version_picture_idx" ON "cms"."_people_v" USING btree ("version_picture_id");
  CREATE INDEX "_people_v_version_version_topic_idx" ON "cms"."_people_v" USING btree ("version_topic");
  CREATE INDEX "_people_v_version_version_source_idx" ON "cms"."_people_v" USING btree ("version_source");
  CREATE INDEX "_people_v_version_version_updated_at_idx" ON "cms"."_people_v" USING btree ("version_updated_at");
  CREATE INDEX "_people_v_version_version_created_at_idx" ON "cms"."_people_v" USING btree ("version_created_at");
  CREATE INDEX "_people_v_created_at_idx" ON "cms"."_people_v" USING btree ("created_at");
  CREATE INDEX "_people_v_updated_at_idx" ON "cms"."_people_v" USING btree ("updated_at");
  CREATE INDEX "faqs__order_idx" ON "cms"."faqs" USING btree ("_order");
  CREATE INDEX "faqs_topic_idx" ON "cms"."faqs" USING btree ("topic");
  CREATE UNIQUE INDEX "faqs_source_idx" ON "cms"."faqs" USING btree ("source");
  CREATE INDEX "faqs_updated_at_idx" ON "cms"."faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "cms"."faqs" USING btree ("created_at");
  CREATE INDEX "_faqs_v_parent_idx" ON "cms"."_faqs_v" USING btree ("parent_id");
  CREATE INDEX "_faqs_v_version_version__order_idx" ON "cms"."_faqs_v" USING btree ("version__order");
  CREATE INDEX "_faqs_v_version_version_topic_idx" ON "cms"."_faqs_v" USING btree ("version_topic");
  CREATE INDEX "_faqs_v_version_version_source_idx" ON "cms"."_faqs_v" USING btree ("version_source");
  CREATE INDEX "_faqs_v_version_version_updated_at_idx" ON "cms"."_faqs_v" USING btree ("version_updated_at");
  CREATE INDEX "_faqs_v_version_version_created_at_idx" ON "cms"."_faqs_v" USING btree ("version_created_at");
  CREATE INDEX "_faqs_v_created_at_idx" ON "cms"."_faqs_v" USING btree ("created_at");
  CREATE INDEX "_faqs_v_updated_at_idx" ON "cms"."_faqs_v" USING btree ("updated_at");
  CREATE INDEX "locations__order_idx" ON "cms"."locations" USING btree ("_order");
  CREATE INDEX "locations_picture_idx" ON "cms"."locations" USING btree ("picture_id");
  CREATE INDEX "locations_topic_idx" ON "cms"."locations" USING btree ("topic");
  CREATE UNIQUE INDEX "locations_source_idx" ON "cms"."locations" USING btree ("source");
  CREATE INDEX "locations_updated_at_idx" ON "cms"."locations" USING btree ("updated_at");
  CREATE INDEX "locations_created_at_idx" ON "cms"."locations" USING btree ("created_at");
  CREATE INDEX "_locations_v_parent_idx" ON "cms"."_locations_v" USING btree ("parent_id");
  CREATE INDEX "_locations_v_version_version__order_idx" ON "cms"."_locations_v" USING btree ("version__order");
  CREATE INDEX "_locations_v_version_version_picture_idx" ON "cms"."_locations_v" USING btree ("version_picture_id");
  CREATE INDEX "_locations_v_version_version_topic_idx" ON "cms"."_locations_v" USING btree ("version_topic");
  CREATE INDEX "_locations_v_version_version_source_idx" ON "cms"."_locations_v" USING btree ("version_source");
  CREATE INDEX "_locations_v_version_version_updated_at_idx" ON "cms"."_locations_v" USING btree ("version_updated_at");
  CREATE INDEX "_locations_v_version_version_created_at_idx" ON "cms"."_locations_v" USING btree ("version_created_at");
  CREATE INDEX "_locations_v_created_at_idx" ON "cms"."_locations_v" USING btree ("created_at");
  CREATE INDEX "_locations_v_updated_at_idx" ON "cms"."_locations_v" USING btree ("updated_at");
  CREATE INDEX "logos__order_idx" ON "cms"."logos" USING btree ("_order");
  CREATE INDEX "logos_picture_idx" ON "cms"."logos" USING btree ("picture_id");
  CREATE INDEX "logos_topic_idx" ON "cms"."logos" USING btree ("topic");
  CREATE UNIQUE INDEX "logos_source_idx" ON "cms"."logos" USING btree ("source");
  CREATE INDEX "logos_updated_at_idx" ON "cms"."logos" USING btree ("updated_at");
  CREATE INDEX "logos_created_at_idx" ON "cms"."logos" USING btree ("created_at");
  CREATE INDEX "_logos_v_parent_idx" ON "cms"."_logos_v" USING btree ("parent_id");
  CREATE INDEX "_logos_v_version_version__order_idx" ON "cms"."_logos_v" USING btree ("version__order");
  CREATE INDEX "_logos_v_version_version_picture_idx" ON "cms"."_logos_v" USING btree ("version_picture_id");
  CREATE INDEX "_logos_v_version_version_topic_idx" ON "cms"."_logos_v" USING btree ("version_topic");
  CREATE INDEX "_logos_v_version_version_source_idx" ON "cms"."_logos_v" USING btree ("version_source");
  CREATE INDEX "_logos_v_version_version_updated_at_idx" ON "cms"."_logos_v" USING btree ("version_updated_at");
  CREATE INDEX "_logos_v_version_version_created_at_idx" ON "cms"."_logos_v" USING btree ("version_created_at");
  CREATE INDEX "_logos_v_created_at_idx" ON "cms"."_logos_v" USING btree ("created_at");
  CREATE INDEX "_logos_v_updated_at_idx" ON "cms"."_logos_v" USING btree ("updated_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "cms"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "cms"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "cms"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_logos_fk" FOREIGN KEY ("logos_id") REFERENCES "cms"."logos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_locations_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("locations_id");
  CREATE INDEX "payload_locked_documents_rels_logos_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("logos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."product_pages_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."product_pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_product_pages_v_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_product_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_testimonials_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_people_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_faqs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."locations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_locations_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_logos_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."pages_blocks_list" CASCADE;
  DROP TABLE "cms"."pages_rels" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_list" CASCADE;
  DROP TABLE "cms"."_pages_v_rels" CASCADE;
  DROP TABLE "cms"."product_pages_blocks_list" CASCADE;
  DROP TABLE "cms"."product_pages_rels" CASCADE;
  DROP TABLE "cms"."_product_pages_v_blocks_list" CASCADE;
  DROP TABLE "cms"."_product_pages_v_rels" CASCADE;
  DROP TABLE "cms"."testimonials" CASCADE;
  DROP TABLE "cms"."_testimonials_v" CASCADE;
  DROP TABLE "cms"."people" CASCADE;
  DROP TABLE "cms"."_people_v" CASCADE;
  DROP TABLE "cms"."faqs" CASCADE;
  DROP TABLE "cms"."_faqs_v" CASCADE;
  DROP TABLE "cms"."locations" CASCADE;
  DROP TABLE "cms"."_locations_v" CASCADE;
  DROP TABLE "cms"."logos" CASCADE;
  DROP TABLE "cms"."_logos_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_testimonials_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_people_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_faqs_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_locations_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_logos_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_testimonials_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_people_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_faqs_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_locations_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_logos_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "people_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "faqs_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "locations_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "logos_id";
  DROP TYPE "cms"."enum_pages_blocks_list_list";
  DROP TYPE "cms"."enum_pages_blocks_list_show";
  DROP TYPE "cms"."enum__pages_v_blocks_list_list";
  DROP TYPE "cms"."enum__pages_v_blocks_list_show";
  DROP TYPE "cms"."enum_product_pages_blocks_list_list";
  DROP TYPE "cms"."enum_product_pages_blocks_list_show";
  DROP TYPE "cms"."enum__product_pages_v_blocks_list_list";
  DROP TYPE "cms"."enum__product_pages_v_blocks_list_show";`)
}
