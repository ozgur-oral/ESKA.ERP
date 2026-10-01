import { findCorsStations, getCorsSummary } from "../repositories/cors.repository.js";
export const listCorsStations=(status?:string)=>findCorsStations(status);
export const getCorsOperationsSummary=()=>getCorsSummary();
