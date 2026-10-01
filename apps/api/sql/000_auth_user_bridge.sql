-- Business SQL katmanındaki kullanıcı FK'larının hedefi.
-- Kimlik doğrulama halen auth/users.ts üzerinden yapılır; bu tablo ilişkisel bütünlük köprüsüdür.
CREATE TABLE IF NOT EXISTS "user" (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PASSIVE')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO "user" (id,username,email,"firstName","lastName",role,status) VALUES
(1,'admin','admin@eska.local','ESKA','Administrator','ADMIN','ACTIVE'),
(2,'satis','satis@eska.local','Satış','Kullanıcısı','SALES','ACTIVE'),
(3,'destek','destek@eska.local','Destek','Kullanıcısı','SUPPORT','ACTIVE'),
(4,'servis','servis@eska.local','Servis','Kullanıcısı','SERVICE','ACTIVE'),
(5,'satinalma','satinalma@eska.local','Satın Alma','Kullanıcısı','PURCHASING','ACTIVE'),
(6,'finans','finans@eska.local','Finans','Kullanıcısı','FINANCE','ACTIVE')
ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username,email=EXCLUDED.email,"firstName"=EXCLUDED."firstName","lastName"=EXCLUDED."lastName",role=EXCLUDED.role,status=EXCLUDED.status;
