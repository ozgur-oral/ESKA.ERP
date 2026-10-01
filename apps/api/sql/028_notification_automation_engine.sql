ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "userId" INTEGER NULL REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "roleCode" VARCHAR(80) NULL;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS notification_user_read_idx ON "notification"("userId","isRead","createdAt" DESC);