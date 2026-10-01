CREATE TABLE IF NOT EXISTS "permission" (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "role" (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "rolePermission" (
  "roleCode" TEXT NOT NULL REFERENCES "role"(code) ON DELETE CASCADE,
  "permissionCode" TEXT NOT NULL REFERENCES "permission"(code) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY("roleCode","permissionCode")
);
INSERT INTO "permission"(code,name,module) VALUES
('dashboard.view','Dashboard Görüntüle','Dashboard'),('customer.view','Müşteri Görüntüle','Müşteri'),('customer.manage','Müşteri Yönet','Müşteri'),
('sales.view','Satış Görüntüle','Satış'),('sales.manage','Satış Yönet','Satış'),('stock.view','Stok Görüntüle','Stok'),('stock.manage','Stok Yönet','Stok'),
('purchase.view','Satın Alma Görüntüle','Satın Alma'),('purchase.manage','Satın Alma Yönet','Satın Alma'),('rental.view','Kiralama Görüntüle','Kiralama'),('rental.manage','Kiralama Yönet','Kiralama'),
('maintenance.view','Bakım Görüntüle','Bakım'),('maintenance.manage','Bakım Yönet','Bakım'),('document.view','Doküman Görüntüle','Doküman'),('document.manage','Doküman Yönet','Doküman'),
('finance.view','Finans Görüntüle','Finans'),('finance.manage','Finans Yönet','Finans'),('service.view','Servis Görüntüle','Servis'),('service.manage','Servis Yönet','Servis'),
('support.view','Destek Görüntüle','Destek'),('support.manage','Destek Yönet','Destek'),('cors.view','CORS Görüntüle','CORS'),('cors.manage','CORS Yönet','CORS'),
('project.view','Proje Görüntüle','Proje'),('project.manage','Proje Yönet','Proje'),('task.view','Görev Görüntüle','Görev'),('task.manage','Görev Yönet','Görev'),
('report.view','Rapor Görüntüle','Rapor'),('user.view','Kullanıcı Görüntüle','Sistem'),('user.manage','Kullanıcı Yönet','Sistem'),('settings.manage','Ayarları Yönet','Sistem'),('audit.view','Audit Görüntüle','Sistem'),
('organization.view','Organizasyon Görüntüle','İK'),('organization.manage','Organizasyon Yönet','İK'),('field.view','Saha Görüntüle','Saha'),('field.manage','Saha Yönet','Saha'),
('expense.view','Masraf Görüntüle','Masraf'),('expense.manage','Masraf Yönet','Masraf'),('expense.approve','Masraf Onayla','Masraf') ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,module=EXCLUDED.module;
INSERT INTO "role"(code,name,"isSystem") VALUES ('ADMIN','Yönetici',true),('SALES','Satış',true),('SUPPORT','Destek',true),('SERVICE','Teknik Servis',true),('PURCHASING','Satın Alma',true),('FINANCE','Finans',true) ON CONFLICT(code) DO NOTHING;
INSERT INTO "rolePermission"("roleCode","permissionCode") SELECT 'ADMIN',code FROM "permission" ON CONFLICT DO NOTHING;
-- Existing profiles are seeded once; after this migration DB is the source of truth.
INSERT INTO "rolePermission"("roleCode","permissionCode") VALUES
('SALES','dashboard.view'),('SALES','expense.view'),('SALES','field.view'),('SALES','organization.view'),('SALES','document.view'),('SALES','document.manage'),('SALES','task.view'),('SALES','task.manage'),('SALES','customer.view'),('SALES','customer.manage'),('SALES','sales.view'),('SALES','sales.manage'),('SALES','stock.view'),('SALES','rental.view'),('SALES','rental.manage'),('SALES','maintenance.view'),('SALES','purchase.view'),('SALES','service.view'),('SALES','support.view'),('SALES','cors.view'),('SALES','project.view'),('SALES','report.view'),
('SUPPORT','dashboard.view'),('SUPPORT','expense.view'),('SUPPORT','field.view'),('SUPPORT','organization.view'),('SUPPORT','document.view'),('SUPPORT','document.manage'),('SUPPORT','task.view'),('SUPPORT','task.manage'),('SUPPORT','customer.view'),('SUPPORT','service.view'),('SUPPORT','support.view'),('SUPPORT','support.manage'),('SUPPORT','cors.view'),('SUPPORT','stock.view'),('SUPPORT','rental.view'),('SUPPORT','maintenance.view'),
('SERVICE','dashboard.view'),('SERVICE','expense.view'),('SERVICE','field.view'),('SERVICE','organization.view'),('SERVICE','document.view'),('SERVICE','document.manage'),('SERVICE','task.view'),('SERVICE','task.manage'),('SERVICE','customer.view'),('SERVICE','service.view'),('SERVICE','service.manage'),('SERVICE','support.view'),('SERVICE','cors.view'),('SERVICE','stock.view'),('SERVICE','rental.view'),('SERVICE','rental.manage'),('SERVICE','maintenance.view'),('SERVICE','maintenance.manage'),
('PURCHASING','dashboard.view'),('PURCHASING','expense.view'),('PURCHASING','field.view'),('PURCHASING','organization.view'),('PURCHASING','document.view'),('PURCHASING','document.manage'),('PURCHASING','task.view'),('PURCHASING','task.manage'),('PURCHASING','customer.view'),('PURCHASING','stock.view'),('PURCHASING','stock.manage'),('PURCHASING','purchase.view'),('PURCHASING','purchase.manage'),('PURCHASING','sales.view'),('PURCHASING','report.view'),('PURCHASING','rental.view'),('PURCHASING','maintenance.view'),
('FINANCE','dashboard.view'),('FINANCE','expense.view'),('FINANCE','expense.approve'),('FINANCE','field.view'),('FINANCE','organization.view'),('FINANCE','document.view'),('FINANCE','document.manage'),('FINANCE','task.view'),('FINANCE','task.manage'),('FINANCE','customer.view'),('FINANCE','sales.view'),('FINANCE','purchase.view'),('FINANCE','service.view'),('FINANCE','cors.view'),('FINANCE','report.view'),('FINANCE','finance.view'),('FINANCE','finance.manage'),('FINANCE','rental.view'),('FINANCE','maintenance.view') ON CONFLICT DO NOTHING;
