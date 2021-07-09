DROP TABLE IF EXISTS "public"."busPunctualities";
-- This script only contains the table creation statements and does not fully represent the table in database. It's still missing: indices, triggers. Do not use it as backup.

-- Squences
CREATE SEQUENCE IF NOT EXISTS "busPunctualities_id_seq";

-- Table Definition
CREATE TABLE "public"."busPunctualities" (
    "id" int4 NOT NULL DEFAULT nextval('"busPunctualities_id_seq"'::regclass),
    "busId" int4,
    "punctuality" int4
);

