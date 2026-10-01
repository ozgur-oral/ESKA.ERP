
-- ESKA.ERP
-- Communication Module RBAC Seed
-- Mevcut roleCode ve permissionCode yapisina uyumludur.

-- 1. Iletisim modulu yetkilerini olustur.

INSERT INTO "permission" (
    code,
    name,
    module
)
VALUES
    (
        'communication.view',
        'İletişim Görüntüle',
        'İLETİŞİM'
    ),
    (
        'communication.manage',
        'İletişim Yönet',
        'İLETİŞİM'
    )
ON CONFLICT (code) DO NOTHING;


-- 2. ADMIN rolune iletisim goruntuleme
-- ve yonetme yetkilerini ver.

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
        'communication.view',
        'communication.manage'
    )
ON CONFLICT DO NOTHING;


-- 3. SALES, SUPPORT, SERVICE ve FINANCE
-- rollerine iletisim goruntuleme yetkisi ver.

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
        'SERVICE',
        'FINANCE'
    )
    AND p.code = 'communication.view'
ON CONFLICT DO NOTHING;