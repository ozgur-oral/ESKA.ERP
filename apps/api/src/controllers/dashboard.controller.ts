import type {Request,Response} from "express";import {getDashboardSummary} from "../services/dashboard.service.js";import {ok} from "../utils/http.js";
export async function dashboardSummary(_req:Request,res:Response){return ok(res,await getDashboardSummary())}
