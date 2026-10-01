import type{Request,Response}from"express";import*as s from"../services/communication.service.js";import{ok}from"../utils/http.js";import{recordAudit}from"../services/audit.service.js";
export async function templates(_q:Request,r:Response){return ok(r,await s.listTemplates())}
export async function outbox(q:Request,r:Response){return ok(r,await s.listOutbox(q.query.limit?Number(q.query.limit):100))}
export async function summary(_q:Request,r:Response){return ok(r,await s.getSummary())}
export async function enqueue(q:Request,r:Response){if(!q.body?.channel||!q.body?.recipient||!q.body?.body)return r.status(400).json({success:false,message:"Kanal, alıcı ve içerik zorunludur."});const x=await s.enqueue(q.body,q.auth?.userId);await recordAudit({action:"CREATE",module:"COMMUNICATION",entityType:"communicationOutbox",entityId:Number(x.id),entityLabel:x.recipient,newValues:{channel:x.channel,recipient:x.recipient,status:x.status}});return r.status(201).json({success:true,data:x})}
export async function retry(q:Request,r:Response){const x=await s.retry(Number(q.params.id));return ok(r,x)}
export async function process(q:Request,r:Response){return ok(r,await s.processBatch(q.body?.limit||10))}
