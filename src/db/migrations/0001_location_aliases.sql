CREATE TABLE "location_aliases" (
	"normalized_query" text NOT NULL,
	"country_code" text NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_aliases_normalized_query_country_code_pk" PRIMARY KEY("normalized_query","country_code")
);
--> statement-breakpoint
ALTER TABLE "location_aliases" ADD CONSTRAINT "location_aliases_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_aliases_location_id_idx" ON "location_aliases" USING btree ("location_id");