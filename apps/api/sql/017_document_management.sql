CREATE TABLE IF NOT EXISTS "documentCategory" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "documentCategory"("code","name","description") VALUES
 ('GENERAL','Genel','Genel dokümanlar'),
 ('QUOTE','Teklif','Teklif ve fiyat dokümanları'),
 ('CONTRACT','Sözleşme','Sözleşme ve protokoller'),
 ('SERVICE','Servis Formu','Teknik servis belgeleri'),
 ('CALIBRATION','Kalibrasyon','Kalibrasyon sertifikaları'),
 ('PROJECT','Proje Dosyası','Proje, çizim, kroki ve harita dosyaları'),
 ('DEVICE','Cihaz Belgesi','Cihaza ait belge ve sertifikalar'),
 ('FINANCE','Finans','Fatura, dekont ve finans belgeleri')
ON CONFLICT("code") DO NOTHING;

CREATE TABLE IF NOT EXISTS "document" (
  "id" SERIAL PRIMARY KEY,
  "documentNo" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" INTEGER REFERENCES "documentCategory"("id"),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','ARCHIVED','CANCELLED')),
  "accessLevel" TEXT NOT NULL DEFAULT 'INTERNAL' CHECK ("accessLevel" IN ('INTERNAL','RESTRICTED','PUBLIC')),
  "ownerUserId" INTEGER REFERENCES "user"("id"),
  "currentVersionId" INTEGER,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "documentLink" (
  "id" SERIAL PRIMARY KEY,
  "documentId" INTEGER NOT NULL REFERENCES "document"("id") ON DELETE CASCADE,
  "entityType" TEXT NOT NULL CHECK ("entityType" IN ('CUSTOMER','PROJECT','SERVICE_RECORD','DEVICE','QUOTE','ORDER','SUPPORT_TICKET','CORS_SUBSCRIPTION','RENTAL','PURCHASE_ORDER','FINANCE_DOCUMENT','MAINTENANCE','CALIBRATION','OTHER')),
  "entityId" INTEGER NOT NULL,
  "label" TEXT,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("documentId","entityType","entityId")
);
CREATE INDEX IF NOT EXISTS "documentLink_entity_idx" ON "documentLink"("entityType","entityId");

CREATE TABLE IF NOT EXISTS "documentVersion" (
  "id" SERIAL PRIMARY KEY,
  "documentId" INTEGER NOT NULL REFERENCES "document"("id") ON DELETE CASCADE,
  "versionNo" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL UNIQUE,
  "mimeType" TEXT,
  "fileSize" BIGINT NOT NULL DEFAULT 0,
  "sha256" TEXT,
  "changeNote" TEXT,
  "uploadedBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("documentId","versionNo")
);
CREATE INDEX IF NOT EXISTS "documentVersion_document_idx" ON "documentVersion"("documentId","versionNo" DESC);

DO $$ BEGIN
  ALTER TABLE "document" ADD CONSTRAINT "document_current_version_fk" FOREIGN KEY ("currentVersionId") REFERENCES "documentVersion"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "documentAccessRule" (
  "id" SERIAL PRIMARY KEY,
  "documentId" INTEGER NOT NULL REFERENCES "document"("id") ON DELETE CASCADE,
  "roleCode" TEXT,
  "userId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
  "canView" BOOLEAN NOT NULL DEFAULT TRUE,
  "canEdit" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("roleCode" IS NOT NULL OR "userId" IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS "documentAccessRule_document_idx" ON "documentAccessRule"("documentId");

CREATE TABLE IF NOT EXISTS "documentAudit" (
  "id" SERIAL PRIMARY KEY,
  "documentId" INTEGER NOT NULL REFERENCES "document"("id") ON DELETE CASCADE,
  "versionId" INTEGER REFERENCES "documentVersion"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL CHECK ("action" IN ('CREATE','UPLOAD','DOWNLOAD','LINK','UNLINK','ARCHIVE','RESTORE','ACCESS_UPDATE')),
  "userId" INTEGER REFERENCES "user"("id"),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "documentAudit_document_idx" ON "documentAudit"("documentId","createdAt" DESC);
