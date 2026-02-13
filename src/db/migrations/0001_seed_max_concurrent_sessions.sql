INSERT INTO "constants" ("key", "value")
VALUES ('MAX_CONCURRENT_SESSION_COUNT', '{"MAX_CONCURRENT_SESSION_COUNT":1}'::jsonb)
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    "updated_at" = now();
