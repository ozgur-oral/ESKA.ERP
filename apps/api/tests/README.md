# ESKA.ERP API doğrulama

- `npm run verify:static`: DB gerektirmeyen auth/RBAC/migration/security regresyon kontrolleri.
- `npm run db:business`: PostgreSQL üzerinde 001→023 migration zinciri.
- `npm run typecheck`: TypeScript compile kontrolü.

Canlı DB smoke testleri için `DATABASE_URL` gerekir. Migration testi temiz/geçici PostgreSQL veritabanında çalıştırılmalıdır.
