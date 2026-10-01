import*as repo from"../repositories/communication.repository.js";
function configured(channel:string){if(channel==='EMAIL')return !!process.env.SMTP_HOST;if(channel==='SMS')return !!process.env.SMS_PROVIDER_URL;if(channel==='WHATSAPP')return !!process.env.WHATSAPP_PROVIDER_URL;return false}
export const listTemplates=repo.templates;export const listOutbox=repo.outbox;export const getSummary=repo.summary;export const enqueue=repo.enqueue;export const retry=repo.retry;
export async function processBatch(limit=10){const jobs=await repo.claim(limit);let sent=0,failed=0;for(const j of jobs){try{if(!configured(j.channel))throw new Error(`${j.channel} sağlayıcısı yapılandırılmamış.`);
/* Provider adapters intentionally remain behind environment-specific integration boundary. Do not fake delivery. */
throw new Error(`${j.channel} adapteri için canlı sağlayıcı bağlantısı gerekli.`);
}catch(e:any){failed++;await repo.failed(j.id,e?.message||'Gönderim hatası')}}return{claimed:jobs.length,sent,failed}}
