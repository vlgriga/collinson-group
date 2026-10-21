ALTER TABLE "daily_weather" ADD COLUMN "snow_depth_max_cm" double precision;--> statement-breakpoint
ALTER TABLE "daily_weather" ADD COLUMN "snowfall_cm" double precision;--> statement-breakpoint
ALTER TABLE "daily_weather" ADD COLUMN "temperature_max_c" double precision;--> statement-breakpoint
ALTER TABLE "daily_weather" ADD COLUMN "wind_gusts_max_kmh" double precision;--> statement-breakpoint
-- The days stored before have none of the columns above, yet would be answered from as they are
-- until their week runs out; without them, the next request for a place fetches its week again.
DELETE FROM "daily_weather";
