CREATE TABLE "daily_weather" (
	"location_id" uuid NOT NULL,
	"date" date NOT NULL,
	"precipitation_mm" double precision,
	"apparent_temperature_max_c" double precision,
	"sunshine_duration_h" double precision,
	"daylight_duration_h" double precision,
	"wind_speed_max_kmh" double precision,
	"uv_index_max" double precision,
	"weather_code" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_weather_location_id_date_pk" PRIMARY KEY("location_id","date")
);
--> statement-breakpoint
CREATE TABLE "forecast_fetches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geocoding_id" integer NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"country_code" text NOT NULL,
	"admin1" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"elevation_m" double precision,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_geocoding_id_unique" UNIQUE("geocoding_id")
);
--> statement-breakpoint
ALTER TABLE "daily_weather" ADD CONSTRAINT "daily_weather_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_fetches" ADD CONSTRAINT "forecast_fetches_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forecast_fetches_location_fetched_at_idx" ON "forecast_fetches" USING btree ("location_id","fetched_at");