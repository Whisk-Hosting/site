import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE SCHEMA IF NOT EXISTS "cms";
   CREATE TYPE "cms"."enum_pages_blocks_products_show" AS ENUM('latest', 'collection', 'category');
  CREATE TYPE "cms"."enum_pages_blocks_form_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'checkbox');
  CREATE TYPE "cms"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__pages_v_blocks_products_show" AS ENUM('latest', 'collection', 'category');
  CREATE TYPE "cms"."enum__pages_v_blocks_form_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'checkbox');
  CREATE TYPE "cms"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_product_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__product_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar,
  	"link_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"content_html" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"wide" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_columns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"show" "cms"."enum_pages_blocks_products_show" DEFAULT 'latest',
  	"handle" varchar,
  	"limit" numeric DEFAULT 8,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"label" varchar,
  	"type" "cms"."enum_pages_blocks_form_fields_type" DEFAULT 'text',
  	"required" boolean
  );
  
  CREATE TABLE "cms"."pages_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"heading" varchar,
  	"submit" varchar DEFAULT 'Send',
  	"thanks" varchar DEFAULT 'Thanks, we''ll be in touch.',
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"path" varchar DEFAULT '/',
  	"description" varchar,
  	"image_id" integer,
  	"noindex" boolean,
  	"head" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar,
  	"link_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"content_html" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"wide" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_columns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"show" "cms"."enum__pages_v_blocks_products_show" DEFAULT 'latest',
  	"handle" varchar,
  	"limit" numeric DEFAULT 8,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"label" varchar,
  	"type" "cms"."enum__pages_v_blocks_form_fields_type" DEFAULT 'text',
  	"required" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"heading" varchar,
  	"submit" varchar DEFAULT 'Send',
  	"thanks" varchar DEFAULT 'Thanks, we''ll be in touch.',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_path" varchar DEFAULT '/',
  	"version_description" varchar,
  	"version_image_id" integer,
  	"version_noindex" boolean,
  	"version_head" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "cms"."product_pages_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"content_html" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."product_pages_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"wide" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."product_pages_blocks_columns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "cms"."product_pages_blocks_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."product_pages_blocks_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."product_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"handle" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_product_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_product_pages_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"content_html" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_product_pages_v_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"wide" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_product_pages_v_blocks_columns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_product_pages_v_blocks_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_product_pages_v_blocks_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_product_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_handle" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__product_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "cms"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "cms"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"email" varchar NOT NULL,
  	"whisk_user_id" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"product_pages_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "cms"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "cms"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."menus_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."menus_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."menus_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar
  );
  
  CREATE TABLE "cms"."menus" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "cms"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_content" ADD CONSTRAINT "pages_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_media" ADD CONSTRAINT "pages_blocks_media_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_media" ADD CONSTRAINT "pages_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_columns_items" ADD CONSTRAINT "pages_blocks_columns_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_columns_items" ADD CONSTRAINT "pages_blocks_columns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_columns" ADD CONSTRAINT "pages_blocks_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_products" ADD CONSTRAINT "pages_blocks_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_form_fields" ADD CONSTRAINT "pages_blocks_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_form" ADD CONSTRAINT "pages_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_html" ADD CONSTRAINT "pages_blocks_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages" ADD CONSTRAINT "pages_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_content" ADD CONSTRAINT "_pages_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_media" ADD CONSTRAINT "_pages_v_blocks_media_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_media" ADD CONSTRAINT "_pages_v_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_columns_items" ADD CONSTRAINT "_pages_v_blocks_columns_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_columns_items" ADD CONSTRAINT "_pages_v_blocks_columns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_columns" ADD CONSTRAINT "_pages_v_blocks_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_products" ADD CONSTRAINT "_pages_v_blocks_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_form_fields" ADD CONSTRAINT "_pages_v_blocks_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_form" ADD CONSTRAINT "_pages_v_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_html" ADD CONSTRAINT "_pages_v_blocks_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v" ADD CONSTRAINT "_pages_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_content" ADD CONSTRAINT "product_pages_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."product_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_media" ADD CONSTRAINT "product_pages_blocks_media_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_media" ADD CONSTRAINT "product_pages_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."product_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_columns_items" ADD CONSTRAINT "product_pages_blocks_columns_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_columns_items" ADD CONSTRAINT "product_pages_blocks_columns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."product_pages_blocks_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_columns" ADD CONSTRAINT "product_pages_blocks_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."product_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."product_pages_blocks_html" ADD CONSTRAINT "product_pages_blocks_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."product_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_content" ADD CONSTRAINT "_product_pages_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_product_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_media" ADD CONSTRAINT "_product_pages_v_blocks_media_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_media" ADD CONSTRAINT "_product_pages_v_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_product_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_columns_items" ADD CONSTRAINT "_product_pages_v_blocks_columns_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_columns_items" ADD CONSTRAINT "_product_pages_v_blocks_columns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_product_pages_v_blocks_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_columns" ADD CONSTRAINT "_product_pages_v_blocks_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_product_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v_blocks_html" ADD CONSTRAINT "_product_pages_v_blocks_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_product_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_product_pages_v" ADD CONSTRAINT "_product_pages_v_parent_id_product_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."product_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_pages_fk" FOREIGN KEY ("product_pages_id") REFERENCES "cms"."product_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."menus_header" ADD CONSTRAINT "menus_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."menus_columns_links" ADD CONSTRAINT "menus_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."menus_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."menus_columns" ADD CONSTRAINT "menus_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."menus"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_order_idx" ON "cms"."pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "cms"."pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "cms"."pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_image_idx" ON "cms"."pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "pages_blocks_content_order_idx" ON "cms"."pages_blocks_content" USING btree ("_order");
  CREATE INDEX "pages_blocks_content_parent_id_idx" ON "cms"."pages_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_content_path_idx" ON "cms"."pages_blocks_content" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_order_idx" ON "cms"."pages_blocks_media" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_parent_id_idx" ON "cms"."pages_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_path_idx" ON "cms"."pages_blocks_media" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_image_idx" ON "cms"."pages_blocks_media" USING btree ("image_id");
  CREATE INDEX "pages_blocks_columns_items_order_idx" ON "cms"."pages_blocks_columns_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_columns_items_parent_id_idx" ON "cms"."pages_blocks_columns_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_columns_items_image_idx" ON "cms"."pages_blocks_columns_items" USING btree ("image_id");
  CREATE INDEX "pages_blocks_columns_order_idx" ON "cms"."pages_blocks_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_columns_parent_id_idx" ON "cms"."pages_blocks_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_columns_path_idx" ON "cms"."pages_blocks_columns" USING btree ("_path");
  CREATE INDEX "pages_blocks_products_order_idx" ON "cms"."pages_blocks_products" USING btree ("_order");
  CREATE INDEX "pages_blocks_products_parent_id_idx" ON "cms"."pages_blocks_products" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_products_path_idx" ON "cms"."pages_blocks_products" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_fields_order_idx" ON "cms"."pages_blocks_form_fields" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_fields_parent_id_idx" ON "cms"."pages_blocks_form_fields" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_order_idx" ON "cms"."pages_blocks_form" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_parent_id_idx" ON "cms"."pages_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_path_idx" ON "cms"."pages_blocks_form" USING btree ("_path");
  CREATE INDEX "pages_blocks_html_order_idx" ON "cms"."pages_blocks_html" USING btree ("_order");
  CREATE INDEX "pages_blocks_html_parent_id_idx" ON "cms"."pages_blocks_html" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_html_path_idx" ON "cms"."pages_blocks_html" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_path_idx" ON "cms"."pages" USING btree ("path");
  CREATE INDEX "pages_image_idx" ON "cms"."pages" USING btree ("image_id");
  CREATE INDEX "pages_updated_at_idx" ON "cms"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "cms"."pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "cms"."pages" USING btree ("_status");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "cms"."_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "cms"."_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "cms"."_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_image_idx" ON "cms"."_pages_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_content_order_idx" ON "cms"."_pages_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_content_parent_id_idx" ON "cms"."_pages_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_content_path_idx" ON "cms"."_pages_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_order_idx" ON "cms"."_pages_v_blocks_media" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_parent_id_idx" ON "cms"."_pages_v_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_path_idx" ON "cms"."_pages_v_blocks_media" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_image_idx" ON "cms"."_pages_v_blocks_media" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_columns_items_order_idx" ON "cms"."_pages_v_blocks_columns_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_columns_items_parent_id_idx" ON "cms"."_pages_v_blocks_columns_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_columns_items_image_idx" ON "cms"."_pages_v_blocks_columns_items" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_columns_order_idx" ON "cms"."_pages_v_blocks_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_columns_parent_id_idx" ON "cms"."_pages_v_blocks_columns" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_columns_path_idx" ON "cms"."_pages_v_blocks_columns" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_products_order_idx" ON "cms"."_pages_v_blocks_products" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_products_parent_id_idx" ON "cms"."_pages_v_blocks_products" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_products_path_idx" ON "cms"."_pages_v_blocks_products" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_fields_order_idx" ON "cms"."_pages_v_blocks_form_fields" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_fields_parent_id_idx" ON "cms"."_pages_v_blocks_form_fields" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_order_idx" ON "cms"."_pages_v_blocks_form" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_parent_id_idx" ON "cms"."_pages_v_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_path_idx" ON "cms"."_pages_v_blocks_form" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_html_order_idx" ON "cms"."_pages_v_blocks_html" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_html_parent_id_idx" ON "cms"."_pages_v_blocks_html" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_html_path_idx" ON "cms"."_pages_v_blocks_html" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "cms"."_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_path_idx" ON "cms"."_pages_v" USING btree ("version_path");
  CREATE INDEX "_pages_v_version_version_image_idx" ON "cms"."_pages_v" USING btree ("version_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "cms"."_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "cms"."_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "cms"."_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "cms"."_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "cms"."_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "cms"."_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "cms"."_pages_v" USING btree ("autosave");
  CREATE INDEX "product_pages_blocks_content_order_idx" ON "cms"."product_pages_blocks_content" USING btree ("_order");
  CREATE INDEX "product_pages_blocks_content_parent_id_idx" ON "cms"."product_pages_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "product_pages_blocks_content_path_idx" ON "cms"."product_pages_blocks_content" USING btree ("_path");
  CREATE INDEX "product_pages_blocks_media_order_idx" ON "cms"."product_pages_blocks_media" USING btree ("_order");
  CREATE INDEX "product_pages_blocks_media_parent_id_idx" ON "cms"."product_pages_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "product_pages_blocks_media_path_idx" ON "cms"."product_pages_blocks_media" USING btree ("_path");
  CREATE INDEX "product_pages_blocks_media_image_idx" ON "cms"."product_pages_blocks_media" USING btree ("image_id");
  CREATE INDEX "product_pages_blocks_columns_items_order_idx" ON "cms"."product_pages_blocks_columns_items" USING btree ("_order");
  CREATE INDEX "product_pages_blocks_columns_items_parent_id_idx" ON "cms"."product_pages_blocks_columns_items" USING btree ("_parent_id");
  CREATE INDEX "product_pages_blocks_columns_items_image_idx" ON "cms"."product_pages_blocks_columns_items" USING btree ("image_id");
  CREATE INDEX "product_pages_blocks_columns_order_idx" ON "cms"."product_pages_blocks_columns" USING btree ("_order");
  CREATE INDEX "product_pages_blocks_columns_parent_id_idx" ON "cms"."product_pages_blocks_columns" USING btree ("_parent_id");
  CREATE INDEX "product_pages_blocks_columns_path_idx" ON "cms"."product_pages_blocks_columns" USING btree ("_path");
  CREATE INDEX "product_pages_blocks_html_order_idx" ON "cms"."product_pages_blocks_html" USING btree ("_order");
  CREATE INDEX "product_pages_blocks_html_parent_id_idx" ON "cms"."product_pages_blocks_html" USING btree ("_parent_id");
  CREATE INDEX "product_pages_blocks_html_path_idx" ON "cms"."product_pages_blocks_html" USING btree ("_path");
  CREATE UNIQUE INDEX "product_pages_handle_idx" ON "cms"."product_pages" USING btree ("handle");
  CREATE INDEX "product_pages_updated_at_idx" ON "cms"."product_pages" USING btree ("updated_at");
  CREATE INDEX "product_pages_created_at_idx" ON "cms"."product_pages" USING btree ("created_at");
  CREATE INDEX "product_pages__status_idx" ON "cms"."product_pages" USING btree ("_status");
  CREATE INDEX "_product_pages_v_blocks_content_order_idx" ON "cms"."_product_pages_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_product_pages_v_blocks_content_parent_id_idx" ON "cms"."_product_pages_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_product_pages_v_blocks_content_path_idx" ON "cms"."_product_pages_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_product_pages_v_blocks_media_order_idx" ON "cms"."_product_pages_v_blocks_media" USING btree ("_order");
  CREATE INDEX "_product_pages_v_blocks_media_parent_id_idx" ON "cms"."_product_pages_v_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "_product_pages_v_blocks_media_path_idx" ON "cms"."_product_pages_v_blocks_media" USING btree ("_path");
  CREATE INDEX "_product_pages_v_blocks_media_image_idx" ON "cms"."_product_pages_v_blocks_media" USING btree ("image_id");
  CREATE INDEX "_product_pages_v_blocks_columns_items_order_idx" ON "cms"."_product_pages_v_blocks_columns_items" USING btree ("_order");
  CREATE INDEX "_product_pages_v_blocks_columns_items_parent_id_idx" ON "cms"."_product_pages_v_blocks_columns_items" USING btree ("_parent_id");
  CREATE INDEX "_product_pages_v_blocks_columns_items_image_idx" ON "cms"."_product_pages_v_blocks_columns_items" USING btree ("image_id");
  CREATE INDEX "_product_pages_v_blocks_columns_order_idx" ON "cms"."_product_pages_v_blocks_columns" USING btree ("_order");
  CREATE INDEX "_product_pages_v_blocks_columns_parent_id_idx" ON "cms"."_product_pages_v_blocks_columns" USING btree ("_parent_id");
  CREATE INDEX "_product_pages_v_blocks_columns_path_idx" ON "cms"."_product_pages_v_blocks_columns" USING btree ("_path");
  CREATE INDEX "_product_pages_v_blocks_html_order_idx" ON "cms"."_product_pages_v_blocks_html" USING btree ("_order");
  CREATE INDEX "_product_pages_v_blocks_html_parent_id_idx" ON "cms"."_product_pages_v_blocks_html" USING btree ("_parent_id");
  CREATE INDEX "_product_pages_v_blocks_html_path_idx" ON "cms"."_product_pages_v_blocks_html" USING btree ("_path");
  CREATE INDEX "_product_pages_v_parent_idx" ON "cms"."_product_pages_v" USING btree ("parent_id");
  CREATE INDEX "_product_pages_v_version_version_handle_idx" ON "cms"."_product_pages_v" USING btree ("version_handle");
  CREATE INDEX "_product_pages_v_version_version_updated_at_idx" ON "cms"."_product_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_product_pages_v_version_version_created_at_idx" ON "cms"."_product_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_product_pages_v_version_version__status_idx" ON "cms"."_product_pages_v" USING btree ("version__status");
  CREATE INDEX "_product_pages_v_created_at_idx" ON "cms"."_product_pages_v" USING btree ("created_at");
  CREATE INDEX "_product_pages_v_updated_at_idx" ON "cms"."_product_pages_v" USING btree ("updated_at");
  CREATE INDEX "_product_pages_v_latest_idx" ON "cms"."_product_pages_v" USING btree ("latest");
  CREATE INDEX "_product_pages_v_autosave_idx" ON "cms"."_product_pages_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "media_source_idx" ON "cms"."media" USING btree ("source");
  CREATE INDEX "media_updated_at_idx" ON "cms"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "cms"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "cms"."media" USING btree ("filename");
  CREATE UNIQUE INDEX "users_email_idx" ON "cms"."users" USING btree ("email");
  CREATE UNIQUE INDEX "users_whisk_user_id_idx" ON "cms"."users" USING btree ("whisk_user_id");
  CREATE INDEX "users_updated_at_idx" ON "cms"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "cms"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "cms"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "cms"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "cms"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "cms"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "cms"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "cms"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "cms"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_product_pages_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("product_pages_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "cms"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "cms"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "cms"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "cms"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "cms"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "cms"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "cms"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "cms"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "cms"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "menus_header_order_idx" ON "cms"."menus_header" USING btree ("_order");
  CREATE INDEX "menus_header_parent_id_idx" ON "cms"."menus_header" USING btree ("_parent_id");
  CREATE INDEX "menus_columns_links_order_idx" ON "cms"."menus_columns_links" USING btree ("_order");
  CREATE INDEX "menus_columns_links_parent_id_idx" ON "cms"."menus_columns_links" USING btree ("_parent_id");
  CREATE INDEX "menus_columns_order_idx" ON "cms"."menus_columns" USING btree ("_order");
  CREATE INDEX "menus_columns_parent_id_idx" ON "cms"."menus_columns" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."pages_blocks_hero" CASCADE;
  DROP TABLE "cms"."pages_blocks_content" CASCADE;
  DROP TABLE "cms"."pages_blocks_media" CASCADE;
  DROP TABLE "cms"."pages_blocks_columns_items" CASCADE;
  DROP TABLE "cms"."pages_blocks_columns" CASCADE;
  DROP TABLE "cms"."pages_blocks_products" CASCADE;
  DROP TABLE "cms"."pages_blocks_form_fields" CASCADE;
  DROP TABLE "cms"."pages_blocks_form" CASCADE;
  DROP TABLE "cms"."pages_blocks_html" CASCADE;
  DROP TABLE "cms"."pages" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_hero" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_content" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_media" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_columns_items" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_columns" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_products" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_form_fields" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_form" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_html" CASCADE;
  DROP TABLE "cms"."_pages_v" CASCADE;
  DROP TABLE "cms"."product_pages_blocks_content" CASCADE;
  DROP TABLE "cms"."product_pages_blocks_media" CASCADE;
  DROP TABLE "cms"."product_pages_blocks_columns_items" CASCADE;
  DROP TABLE "cms"."product_pages_blocks_columns" CASCADE;
  DROP TABLE "cms"."product_pages_blocks_html" CASCADE;
  DROP TABLE "cms"."product_pages" CASCADE;
  DROP TABLE "cms"."_product_pages_v_blocks_content" CASCADE;
  DROP TABLE "cms"."_product_pages_v_blocks_media" CASCADE;
  DROP TABLE "cms"."_product_pages_v_blocks_columns_items" CASCADE;
  DROP TABLE "cms"."_product_pages_v_blocks_columns" CASCADE;
  DROP TABLE "cms"."_product_pages_v_blocks_html" CASCADE;
  DROP TABLE "cms"."_product_pages_v" CASCADE;
  DROP TABLE "cms"."media" CASCADE;
  DROP TABLE "cms"."users" CASCADE;
  DROP TABLE "cms"."payload_kv" CASCADE;
  DROP TABLE "cms"."payload_locked_documents" CASCADE;
  DROP TABLE "cms"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "cms"."payload_preferences" CASCADE;
  DROP TABLE "cms"."payload_preferences_rels" CASCADE;
  DROP TABLE "cms"."payload_migrations" CASCADE;
  DROP TABLE "cms"."menus_header" CASCADE;
  DROP TABLE "cms"."menus_columns_links" CASCADE;
  DROP TABLE "cms"."menus_columns" CASCADE;
  DROP TABLE "cms"."menus" CASCADE;
  DROP TYPE "cms"."enum_pages_blocks_products_show";
  DROP TYPE "cms"."enum_pages_blocks_form_fields_type";
  DROP TYPE "cms"."enum_pages_status";
  DROP TYPE "cms"."enum__pages_v_blocks_products_show";
  DROP TYPE "cms"."enum__pages_v_blocks_form_fields_type";
  DROP TYPE "cms"."enum__pages_v_version_status";
  DROP TYPE "cms"."enum_product_pages_status";
  DROP TYPE "cms"."enum__product_pages_v_version_status";`)
}
