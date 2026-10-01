import fs from"node:fs";import path from"node:path";
const root=path.resolve(process.cwd());const failures:string[]=[];
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const sqlDir=path.join(root,"sql");const migrations=fs.readdirSync(sqlDir).filter(x=>x.endsWith(".sql")).sort();
const runner=read("src/scripts/migrate-business.ts");for(const m of migrations)if(!runner.includes(m))failures.push(`Migration runner eksik: ${m}`);
const walk=(d:string):string[]=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk(path.join(root,"src")).filter(x=>/\.(ts|tsx)$/.test(x))){const t=fs.readFileSync(f,"utf8");if(!f.endsWith("verify-release.ts")&&t.includes("req."+"user"))failures.push(`legacy auth alanı bulundu: ${path.relative(root,f)}`)}
const notif=read("src/repositories/cors-operations.repository.ts");if(!notif.includes(`"userId" IS NULL OR "userId"=$2`))failures.push("Bildirim listesinde kullanıcı izolasyonu yok.");
const field=read("src/repositories/field-operations.repository.ts");if(!field.includes("pg_advisory_xact_lock"))failures.push("Saha kaynak concurrency kilidi yok.");if(!field.includes("pool,query"))failures.push("Field operation pool import eksik.");
const doc=read("src/services/document.service.ts");if(!doc.includes("DOCUMENT_ALLOWED_EXTENSIONS"))failures.push("Doküman allowlist yok.");
console.log(JSON.stringify({ok:failures.length===0,migrations:migrations.length,failures},null,2));if(failures.length)process.exit(1);
