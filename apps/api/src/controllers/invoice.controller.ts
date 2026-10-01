import type {Request,Response} from "express";import * as s from "../services/invoice.service.js";import {ok} from "../utils/http.js";
export async function invoicesIndex(req:Request,res:Response){return ok(res,await s.list(typeof req.query.direction==='string'?req.query.direction:undefined,typeof req.query.status==='string'?req.query.status:undefined))}
export async function invoiceShow(req:Request,res:Response){const x=await s.show(Number(req.params.id));if(!x)return res.status(404).json({success:false,message:'Fatura bulunamadı.'});return ok(res,x)}
export async function invoiceSourceSync(_req:Request,res:Response){await s.syncSources();return ok(res,{synced:true},'Fatura kaynakları eşitlendi.')}
export async function invoicePushParasut(req:Request,res:Response){return ok(res,await s.pushToParasut(Number(req.params.id)),'Fatura Paraşüt’e aktarıldı.')}
export async function parasutStatus(_req:Request,res:Response){return ok(res,s.parasutStatus())}
export async function parasutTest(_req:Request,res:Response){return ok(res,await s.parasutTest())}
export async function parasutLogs(_req:Request,res:Response){return ok(res,await s.logs())}
export async function financeTransactionPushParasut(req:Request,res:Response){return ok(res,await s.pushTransaction(Number(req.params.id)),'Tahsilat/ödeme Paraşüt’e aktarıldı.')}
export async function financeVatReport(req:Request,res:Response){return ok(res,await s.vatReport(typeof req.query.from==='string'?req.query.from:undefined,typeof req.query.to==='string'?req.query.to:undefined))}
export async function parasutAccountMappings(_req:Request,res:Response){return ok(res,await s.accountMappings())}
export async function parasutAccountMappingSave(req:Request,res:Response){const accountId=Number(req.params.id);const externalAccountId=String(req.body?.externalAccountId||'').trim();if(!externalAccountId)return res.status(400).json({success:false,message:'Paraşüt hesap ID gereklidir.'});return ok(res,await s.saveAccountMapping(accountId,externalAccountId,req.body?.externalAccountName||null),'Hesap eşlemesi kaydedildi.')}
export async function eDocumentReadiness(_req:Request,res:Response){return ok(res,await s.eDocumentReadiness())}

export async function invoiceQueueParasut(req:Request,res:Response){return ok(res,await s.enqueueInvoice(Number(req.params.id),req.auth?.userId),'Fatura Paraşüt kuyruğuna alındı.')}
export async function financeTransactionQueueParasut(req:Request,res:Response){return ok(res,await s.enqueueTransaction(Number(req.params.id),req.auth?.userId),'Tahsilat/ödeme Paraşüt kuyruğuna alındı.')}
export async function parasutQueue(req:Request,res:Response){return ok(res,await s.parasutQueue(typeof req.query.status==='string'?req.query.status:undefined))}
export async function parasutQueueSummary(_req:Request,res:Response){return ok(res,await s.parasutQueueSummary())}
export async function parasutQueueProcess(req:Request,res:Response){return ok(res,await s.processParasutQueue(Number(req.body?.limit||10)),'Paraşüt kuyruğu işlendi.')}
export async function parasutQueueRetry(req:Request,res:Response){const x=await s.retryParasutJob(Number(req.params.id));if(!x)return res.status(404).json({success:false,message:'Senkronizasyon işi bulunamadı.'});return ok(res,x,'İş tekrar kuyruğa alındı.')}
