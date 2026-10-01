import{pool,query}from"../db/pool.js";
export async function permissionsForRole(role:string){const r=await query<{code:string}>(`SELECT p.code FROM "rolePermission" rp JOIN "permission" p ON p.code=rp."permissionCode" JOIN "role" r ON r.code=rp."roleCode" WHERE rp."roleCode"=$1 AND r."isActive"=true ORDER BY p.code`,[role]);return r.rows.map(x=>x.code)}
export async function roles(){return(await query(`SELECT r.code,r.name,r.description,r."isSystem",r."isActive",COALESCE(json_agg(rp."permissionCode" ORDER BY rp."permissionCode") FILTER(WHERE rp."permissionCode" IS NOT NULL),'[]') permissions FROM "role" r LEFT JOIN "rolePermission" rp ON rp."roleCode"=r.code GROUP BY r.code ORDER BY r."isSystem" DESC,r.name`)).rows}
export async function permissions(){return(await query(`SELECT code,name,module,description FROM "permission" ORDER BY module,name`)).rows}
export async function createRole(x:any){const code=String(x.code||'').trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_');if(!code||!x.name)throw new Error('Rol kodu ve adı zorunludur.');const r=await query(`INSERT INTO "role"(code,name,description,"isSystem") VALUES($1,$2,$3,false) RETURNING *`,[code,String(x.name).trim(),x.description||null]);await setRolePermissions(code,x.permissions||[]);return r.rows[0]}
export async function setRolePermissions(code:string,items:string[]){const c=await pool.connect();try{await c.query('BEGIN');const exists=await c.query(`SELECT code FROM "role" WHERE code=$1 AND "isActive"=true`,[code]);if(!exists.rowCount)throw new Error('Rol bulunamadı.');const valid=await c.query(`SELECT code FROM "permission" WHERE code=ANY($1::text[])`,[items]);if(valid.rowCount!==new Set(items).size)throw new Error('Geçersiz yetki kodu.');await c.query(`DELETE FROM "rolePermission" WHERE "roleCode"=$1`,[code]);if(items.length)await c.query(`INSERT INTO "rolePermission"("roleCode","permissionCode") SELECT $1,unnest($2::text[])`,[code,items]);await c.query('COMMIT');return true}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
export async function setRoleStatus(code:string,isActive:boolean){if(code==='ADMIN'&&!isActive)throw new Error('Yönetici rolü pasifleştirilemez.');const r=await query(`UPDATE "role" SET "isActive"=$2,"updatedAt"=now() WHERE code=$1 RETURNING *`,[code,isActive]);if(!r.rowCount)throw new Error('Rol bulunamadı.');return r.rows[0]}

export async function roleExists(
  code: string
) {
  const result = await query(
    `SELECT 1 FROM "role"
     WHERE code = $1
     AND "isActive" = true`,
    [code]
  );

  return (result.rowCount ?? 0) > 0;
}