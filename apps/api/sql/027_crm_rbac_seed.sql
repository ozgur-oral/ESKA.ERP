
-- ESKA.ERP CRM rol ve yetki tanimlari
-- Mevcut rolePermission tablosunun
-- roleCode ve permissionCode yapisini kullanir.

-- 1. CRM yetkilerini olustur

INSERT INTO "permission" (
    code,
    name,
    module
)
VALUES
    (
        'crm.view',
        'CRM Görüntüle',
        'CRM'
    ),
    (
        'crm.manage',
        'CRM Yönet',
        'CRM'
    )
ON CONFLICT (code) DO NOTHING;


-- 2. ADMIN rolune CRM goruntuleme ve yonetme yetkisi ver

INSERT INTO "rolePermission" (
    "roleCode",
    "permissionCode"
)
SELECT
    r.code,
    p.code
FROM "role" AS r
CROSS JOIN "permission" AS p
WHERE
    r.code = 'ADMIN'
    AND p.code IN (
        'crm.view',
        'crm.manage'
    )
ON CONFLICT DO NOTHING;


-- 3. SALES, SUPPORT ve SERVICE rollerine
-- CRM goruntuleme yetkisi ver

INSERT INTO "rolePermission" (
    "roleCode",
    "permissionCode"
)
SELECT
    r.code,
    p.code
FROM "role" AS r
CROSS JOIN "permission" AS p
WHERE
    r.code IN (
        'SALES',
        'SUPPORT',
        'SERVICE'
    )
    AND p.code = 'crm.view'
ON CONFLICT DO NOTHING;


-- 4. SALES rolune CRM yonetme yetkisi ver

INSERT INTO "rolePermission" (
    "roleCode",
    "permissionCode"
)
SELECT
    r.code,
    p.code
FROM "role" AS r
CROSS JOIN "permission" AS p
WHERE
    r.code = 'SALES'
    AND p.code = 'crm.manage'
ON CONFLICT DO NOTHING;