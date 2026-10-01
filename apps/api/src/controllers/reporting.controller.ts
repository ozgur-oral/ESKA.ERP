import type{Request,Response}from"express";import*as r from"../repositories/reporting.repository.js";import{ok}from"../utils/http.js";
export async function analytics(q:Request,res:Response){return ok(res,await r.executiveAnalytics(q.query.months?Number(q.query.months):12))}
export async function topCustomers(q:Request,res:Response){return ok(res,await r.salesByCustomer(q.query.limit?Number(q.query.limit):10))}
export async function projectProfitability(_q:Request,res:Response){return ok(res,await r.projectProfitability())}
