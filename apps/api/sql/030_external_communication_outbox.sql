
CREATE TABLE IF NOT EXISTS "communicationTemplate"(
 id SERIAL PRIMARY KEY,code VARCHAR(80) NOT NULL UNIQUE,name VARCHAR(160) NOT NULL,
 channel VARCHAR(20) NOT NULL CHECK(channel IN('EMAIL','SMS','WHATSAPP')),
 subject VARCHAR(240) NULL,body TEXT NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT TRUE,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "communicationOutbox"(
 id BIGSERIAL PRIMARY KEY,channel VARCHAR(20) NOT NULL CHECK(channel IN('EMAIL','SMS','WHATSAPP')),
 recipient VARCHAR(320) NOT NULL,subject VARCHAR(240) NULL,body TEXT NOT NULL,
 "templateCode" VARCHAR(80) NULL,"entityType" VARCHAR(60) NULL,"entityId" INTEGER NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','PROCESSING','SENT','RETRY','FAILED','CANCELLED')),
 attempts INTEGER NOT NULL DEFAULT 0,"maxAttempts" INTEGER NOT NULL DEFAULT 5,
 "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"providerMessageId" VARCHAR(240) NULL,
 "lastError" TEXT NULL,"dedupeKey" VARCHAR(240) NULL UNIQUE,"createdBy" INTEGER NULL REFERENCES "user"(id) ON DELETE SET NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"sentAt" TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS communication_outbox_worker_idx ON "communicationOutbox"(status,"nextAttemptAt");
INSERT INTO "communicationTemplate"(code,name,channel,subject,body) VALUES
('QUOTE_READY','Teklif Hazır','EMAIL','Teklifiniz hazır','Merhaba {{customerName}}, {{quoteNo}} numaralı teklifiniz hazırlanmıştır.'),
('SERVICE_READY','Servis Hazır','SMS',NULL,'{{serviceNo}} numaralı servis kaydınız hazırdır.'),
('CORS_EXPIRY','CORS Süre Hatırlatma','SMS',NULL,'CORS aboneliğiniz {{endDate}} tarihinde sona erecektir.'),
('PAYMENT_REMINDER','Ödeme Hatırlatma','EMAIL','Ödeme hatırlatması','Sayın {{customerName}}, vadesi geçen bakiyeniz için bizimle iletişime geçebilirsiniz.')
ON CONFLICT(code) DO NOTHING;
