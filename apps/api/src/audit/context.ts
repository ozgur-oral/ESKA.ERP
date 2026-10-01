import { AsyncLocalStorage } from "node:async_hooks";
export type AuditContext = { requestId:string; method:string; path:string; ipAddress:string|null; userAgent:string|null; userId?:number; userRole?:string };
export const auditContext = new AsyncLocalStorage<AuditContext>();
export function currentAuditContext(){ return auditContext.getStore(); }
