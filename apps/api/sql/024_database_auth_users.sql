ALTER TABLE "user" ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT '';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordSalt" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE "user" SET department=CASE role
 WHEN 'ADMIN' THEN 'Yönetim' WHEN 'SALES' THEN 'Satış' WHEN 'SUPPORT' THEN 'Teknik Destek'
 WHEN 'SERVICE' THEN 'Teknik Servis' WHEN 'PURCHASING' THEN 'Satın Alma' WHEN 'FINANCE' THEN 'Finans / Muhasebe' ELSE department END
WHERE department='';

UPDATE "user" SET "passwordSalt"='8489c3309676791225359281738ce221',"passwordHash"='d43a334d6d008956724abe83a7665e56d218bbfa0aae6dbd76c03090115e816e28a645d54acd669973df8301a510a9bf42ee6a15f58decca05c9e49f136c6912' WHERE username='admin' AND "passwordHash" IS NULL;
UPDATE "user" SET "passwordSalt"='be65c9c55ae171bee580144dcec04ca7',"passwordHash"='e625c3f61f3cbb49bb48b068651dadc43ad49f7f9c2757f733a951a395ecea8348349889a7af4ffaf81015d305cbbb70ec4c0e5017c5500f30335f4b4b0ca3c6' WHERE username='satis' AND "passwordHash" IS NULL;
UPDATE "user" SET "passwordSalt"='8d3d3bfde4cbaac301754721a021ea48',"passwordHash"='eb0d98edba68058a6f8ca452b717eaf1eb988003e4387bc55365c02e54a618d4c2601acb36eee3074f46d975a42e738fc272fbe7efe71009bb67dd38dbe5b476' WHERE username='destek' AND "passwordHash" IS NULL;
UPDATE "user" SET "passwordSalt"='82eab8f05dbedc871c31a65dfe38ca3a',"passwordHash"='ef16302671259d49f32b37d3de35d19967c6f7acd0c4113564c911376d4fab4a0b88bcf32bf514995d9d562642ffc54214297e84fa649d41c8c5f05c5b7c41c9' WHERE username='servis' AND "passwordHash" IS NULL;
UPDATE "user" SET "passwordSalt"='0e55c1445a56c49ff48b8656fdab6c3d',"passwordHash"='150cfdd430d7e1b2dfc104f5f6134a6364ea17191c30cb37c36cb7e171c7699b60e1d27c8d1d78ed5570d9134c68da98e29f9871093dbe896f05edfc98684fd1' WHERE username='satinalma' AND "passwordHash" IS NULL;
UPDATE "user" SET "passwordSalt"='d069bf03eb518697d1225a9e9fe46789',"passwordHash"='bf32f33b82c6b3c4ce387b7b56451679558e0fa0010e56888a256ef8230b3cc3be082ba10667719347b68423f6e8a10de2d7a136fd0ec57839378aa2b9c18cfe' WHERE username='finans' AND "passwordHash" IS NULL;
ALTER TABLE "user" ALTER COLUMN "passwordSalt" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "passwordHash" SET NOT NULL;
CREATE INDEX IF NOT EXISTS user_status_role_idx ON "user"(status,role);
