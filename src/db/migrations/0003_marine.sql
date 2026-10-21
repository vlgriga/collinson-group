CREATE TABLE "daily_marine" (
	"location_id" uuid NOT NULL,
	"date" date NOT NULL,
	"wave_height_max_m" double precision,
	"swell_wave_period_max_s" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_marine_location_id_date_pk" PRIMARY KEY("location_id","date")
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "has_marine" boolean;--> statement-breakpoint
ALTER TABLE "daily_marine" ADD CONSTRAINT "daily_marine_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;