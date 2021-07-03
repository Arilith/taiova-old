DROP TABLE IF EXISTS "public"."busUpdates";
-- This script only contains the table creation statements and does not fully represent the table in database. It's still missing: indices, triggers. Do not use it as backup.

-- Squences
CREATE SEQUENCE IF NOT EXISTS "busUpdates_id_seq";

-- Table Definition
CREATE TABLE "public"."busUpdates" (
    "id" int4 NOT NULL DEFAULT nextval('"busUpdates_id_seq"'::regclass),
    "busId" int4,
    "timestamp" timestamp
);

