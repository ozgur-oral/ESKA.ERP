import { query } from "../db/pool.js";
export type AuditEntry={userId?:number|null;userRole?:string|null;action:string;module:string;entityType?:string|null;entityId?:string|number|null;entityLabel?:string|null;requestMethod?:string|null;requestPath?:string|null;ipAddress?:string|null;userAgent?:string|null;requestId?:string|null;oldValues?:unknown;newValues?:unknown;metadata?:unknown};
export async function insertAudit(a:AuditEntry){
 const r=await query(`INSERT INTO "auditLog" ("userId","userRole",action,module,"entityType","entityId","entityLabel","requestMethod","requestPath","ipAddress","userAgent","requestId","oldValues","newValues",metadata)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb) RETURNING *`,
 [a.userId??null,a.userRole??null,a.action,a.module,a.entityType??null,a.entityId==null?null:String(a.entityId),a.entityLabel??null,a.requestMethod??null,a.requestPath??null,a.ipAddress??null,a.userAgent??null,a.requestId??null,
 a.oldValues===undefined?null:JSON.stringify(a.oldValues),a.newValues===undefined?null:JSON.stringify(a.newValues),a.metadata===undefined?null:JSON.stringify(a.metadata)]);
 return r.rows[0];
}
export async function listAudit(f:{q?:string;module?:string;action?:string;userId?:number;entityType?:string;entityId?:string;from?:string;to?:string;limit?:number;offset?:number}){
 const w:string[]=[];const v:unknown[]=[];const add=(x:unknown)=>{v.push(x);return `$${v.length}`};
 if(f.module)w.push(`a.module=${add(f.module)}`); if(f.action)w.push(`a.action=${add(f.action)}`); if(f.userId)w.push(`a."userId"=${add(f.userId)}`);
 if(f.entityType)w.push(`a."entityType"=${add(f.entityType)}`); if(f.entityId)w.push(`a."entityId"=${add(f.entityId)}`);
 if(f.from)w.push(`a."createdAt">=${add(f.from)}`); if(f.to)w.push(`a."createdAt"<${add(f.to)}`);
 if(f.q){const p=add(`%${f.q}%`);w.push(`(a."entityLabel" ILIKE ${p} OR a."entityId" ILIKE ${p} OR a.module ILIKE ${p} OR a.action ILIKE ${p} OR COALESCE(u.username,'') ILIKE ${p})`)}
 const lim=Math.min(Math.max(f.limit||50,1),200), off=Math.max(f.offset||0,0); const lp=add(lim),op=add(off);
 const where=w.length?`WHERE ${w.join(" AND ")}`:"";
 const rows=await query(`SELECT a.*,u.username,u."firstName",u."lastName" FROM "auditLog" a LEFT JOIN "user" u ON u.id=a."userId" ${where} ORDER BY a."createdAt" DESC LIMIT ${lp} OFFSET ${op}`,v);
 const countVals=v.slice(0,-2); const count=await query<{count:string}>(`SELECT COUNT(*)::text count FROM "auditLog" a LEFT JOIN "user" u ON u.id=a."userId" ${where}`,countVals);
 return {items:rows.rows,total:Number(count.rows[0]?.count||0),limit:lim,offset:off};
}
export async function auditSummary(){
 const r=await query(`SELECT COUNT(*) FILTER(WHERE "createdAt">=CURRENT_DATE)::int today,COUNT(*) FILTER(WHERE "createdAt">=NOW()-INTERVAL '7 days')::int week,COUNT(DISTINCT "userId") FILTER(WHERE "createdAt">=NOW()-INTERVAL '7 days')::int users FROM "auditLog"`);
 return r.rows[0];
}
