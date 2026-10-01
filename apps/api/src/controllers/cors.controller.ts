import type { Request,Response } from "express";
import { getCorsOperationsSummary,listCorsStations } from "../services/cors.service.js";
import { ok } from "../utils/http.js";
export async function corsStationsIndex(req:Request,res:Response){return ok(res,await listCorsStations(typeof req.query.status==="string"?req.query.status:undefined));}
export async function corsSummary(_req:Request,res:Response){return ok(res,await getCorsOperationsSummary());}
