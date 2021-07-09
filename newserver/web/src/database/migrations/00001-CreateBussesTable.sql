DROP TABLE IF EXISTS "public"."busses";

CREATE SEQUENCE IF NOT EXISTS busses_id_seq;

CREATE TABLE "public"."busses" (
    "id" int4 NOT NULL DEFAULT nextval('busses_id_seq'::regclass),
    "company" varchar NOT NULL,
    "originalCompany" varchar NOT NULL,
    "planningNumber" varchar NOT NULL,
    "journeyNumber" int4 NOT NULL,
    "timestamp" int4 NOT NULL,
    "vehicleNumber" int2 NOT NULL,
    "lat" float8,
    "long" float8,
    "status" varchar NOT NULL,
    "createdAt" int4 NOT NULL,
    "updatedAt" int4,
    "routeId" int4,
    "tripId" int4
);

