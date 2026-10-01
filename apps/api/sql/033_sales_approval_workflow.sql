BEGIN;

-- ============================================================
-- ESKA.ERP
-- 033 - Sales Approval Workflow
-- ============================================================


-- ------------------------------------------------------------
-- 1. TEKLİF DURUMLARINI GENİŞLET
-- ------------------------------------------------------------

-- Mevcut quote status CHECK constraint'ini kaldır.
-- Constraint adı PostgreSQL tarafından otomatik verilmiş olabilir,
-- bu nedenle tablo üzerindeki status CHECK constraint'ini dinamik buluyoruz.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname
  INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t
    ON t.oid = c.conrelid
  JOIN pg_namespace n
    ON n.oid = t.relnamespace
  WHERE t.relname = 'quote'
    AND n.nspname = current_schema()
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE "quote" DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;


ALTER TABLE "quote"
ADD CONSTRAINT "quote_status_check"
CHECK (
  "status" IN (
    'DRAFT',

    -- Yeni iç onay süreci
    'PENDING_INTERNAL_APPROVAL',
    'INTERNALLY_APPROVED',
    'REVISION_REQUESTED',

    -- Müşteri süreci
    'SENT_TO_CUSTOMER',
    'CUSTOMER_APPROVED',

    -- Siparişe dönüştürülmüş teklif
    'ORDERED',

    -- Eski sistemle geriye uyumluluk
    'SENT',
    'APPROVED',

    -- Ortak son durumlar
    'REJECTED',
    'EXPIRED',
    'CANCELLED'
  )
);


-- ------------------------------------------------------------
-- 2. GENEL ONAY TALEBİ TABLOSU
-- ------------------------------------------------------------
--
-- Bu tablo sadece satış teklifleri için değildir.
--
-- İleride:
-- SALES_QUOTE
-- FINANCE_RELEASE
-- PURCHASE_ORDER
-- SERVICE_OPERATION
-- RISK_OVERRIDE
-- vb. süreçlerde kullanılabilir.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "approvalRequest" (
  "id" SERIAL PRIMARY KEY,

  "module" TEXT NOT NULL,

  "entityType" TEXT NOT NULL,

  "entityId" INTEGER NOT NULL,

  "approvalType" TEXT NOT NULL,

  "status" TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (
      "status" IN (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'REVISION_REQUESTED',
        'CANCELLED'
      )
    ),

  "requestedBy" INTEGER
    REFERENCES "user"("id")
    ON DELETE SET NULL,

  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  "decidedBy" INTEGER
    REFERENCES "user"("id")
    ON DELETE SET NULL,

  "decidedAt" TIMESTAMPTZ,

  "requestNote" TEXT,

  "decisionNote" TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- 3. ONAY TALEPLERİ İÇİN INDEXLER
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS
  "approvalRequest_entity_idx"
ON "approvalRequest"
(
  "entityType",
  "entityId"
);


CREATE INDEX IF NOT EXISTS
  "approvalRequest_status_idx"
ON "approvalRequest"
(
  "status"
);


CREATE INDEX IF NOT EXISTS
  "approvalRequest_requestedBy_idx"
ON "approvalRequest"
(
  "requestedBy"
);


CREATE INDEX IF NOT EXISTS
  "approvalRequest_decidedBy_idx"
ON "approvalRequest"
(
  "decidedBy"
);


-- ------------------------------------------------------------
-- 4. AYNI KAYIT İÇİN BİRDEN FAZLA AKTİF ONAYI ENGELLE
-- ------------------------------------------------------------
--
-- Örneğin aynı teklif iki kere satış müdürü onayına
-- gönderilemesin.
--
-- Önceki onay tamamlandıktan sonra yeni bir onay talebi
-- oluşturulabilir.
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS
  "approvalRequest_active_unique_idx"
ON "approvalRequest"
(
  "entityType",
  "entityId",
  "approvalType"
)
WHERE "status" = 'PENDING';


-- ------------------------------------------------------------
-- 5. TEKLİF ÜZERİNDE HIZLI ONAY BİLGİLERİ
-- ------------------------------------------------------------

ALTER TABLE "quote"
ADD COLUMN IF NOT EXISTS
  "internalApprovalRequestedAt" TIMESTAMPTZ;


ALTER TABLE "quote"
ADD COLUMN IF NOT EXISTS
  "internalApprovedAt" TIMESTAMPTZ;


ALTER TABLE "quote"
ADD COLUMN IF NOT EXISTS
  "internalApprovedBy" INTEGER;


DO $$
BEGIN
  ALTER TABLE "quote"
  ADD CONSTRAINT
    "quote_internalApprovedBy_fkey"
  FOREIGN KEY ("internalApprovedBy")
  REFERENCES "user"("id")
  ON DELETE SET NULL;

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;


ALTER TABLE "quote"
ADD COLUMN IF NOT EXISTS
  "sentToCustomerAt" TIMESTAMPTZ;


ALTER TABLE "quote"
ADD COLUMN IF NOT EXISTS
  "customerApprovedAt" TIMESTAMPTZ;


-- ------------------------------------------------------------
-- 6. ONAY GEÇMİŞİNİ HIZLI SORGULAMAK İÇİN INDEX
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS
  "approvalRequest_module_status_idx"
ON "approvalRequest"
(
  "module",
  "status",
  "requestedAt"
);

-- ------------------------------------------------------------
-- 7. SATIŞ TEKLİFİ ONAY YETKİSİ
-- ------------------------------------------------------------

INSERT INTO "permission"
(
  code,
  name,
  module,
  description
)
VALUES
(
  'sales.approve',
  'Satış Teklifi Onayla',
  'Satış',
  'Satış tekliflerini iç onay sürecinde onaylama, reddetme veya revizyona gönderme yetkisi'
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  description = EXCLUDED.description;


-- Yönetici rolü yeni satış onay yetkisini otomatik alsın.
INSERT INTO "rolePermission"
(
  "roleCode",
  "permissionCode"
)
VALUES
(
  'ADMIN',
  'sales.approve'
)
ON CONFLICT DO NOTHING;
COMMIT;