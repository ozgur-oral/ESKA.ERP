import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { auditContext } from "../audit/context.js";
export function auditRequestContext(req:Request,res:Response,next:NextFunction){
  const requestId = req.header("x-request-id") || randomUUID();
  res.setHeader("x-request-id", requestId);
  const forwarded=req.header("x-forwarded-for");
  const ip=(forwarded?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || null);
  auditContext.run({requestId,method:req.method,path:req.originalUrl,ipAddress:ip,userAgent:req.header("user-agent")||null},next);
}
export function enrichAuditIdentity(req:Request,res:Response,next:NextFunction){
  const ctx=auditContext.getStore();
  if(ctx && req.auth){ctx.userId=req.auth.userId;ctx.userRole=req.auth.role;}
  next();
}
