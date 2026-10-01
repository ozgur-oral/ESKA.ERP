import type {Request,Response} from "express";
import {globalSearch} from "../services/global-search.service.js";
import {ok} from "../utils/http.js";
export async function globalSearchIndex(req:Request,res:Response){const q=typeof req.query.q==="string"?req.query.q:"";if(q.trim().length<2)return ok(res,[]);return ok(res,await globalSearch(q,req.auth?.permissions??[],Number(req.query.limit??30),req.auth?.userId,req.auth?.role));}
