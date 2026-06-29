CREATE TABLE "article_categories" (
	"article_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "article_categories_article_id_category_id_pk" PRIMARY KEY("article_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"thumbnail_media_id" text,
	"thumbnail_url" text,
	"meta_title" text,
	"meta_description" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_title_unique" UNIQUE("title"),
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" text,
	"image_media_id" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_userId_idx" ON "articles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "article_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "category_parentId_idx" ON "categories" USING btree ("parent_id");