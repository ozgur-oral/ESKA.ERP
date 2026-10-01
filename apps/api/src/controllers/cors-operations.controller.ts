import type { Request, Response } from "express";import {syncDeviceMaintenanceNotifications} from "../services/device-maintenance.service.js";import * as service from "../services/cors-operations.service.js";import {ok,created} from "../utils/http.js";
export async function stationEventsIndex(req:Request,res:Response){return ok(res,await service.getStationEvents(req.query.stationId?Number(req.query.stationId):undefined,req.query.limit?Number(req.query.limit):100));}
export async function stationEventCreate(req:Request,res:Response){return created(res,await service.addStationEvent(req.body),"İstasyon olayı kaydedildi.");}
export async function maintenanceIndex(req:Request,res:Response){return ok(res,await service.getStationMaintenance(req.query.status?String(req.query.status):undefined));}
export async function maintenanceCreate(req:Request,res:Response){return created(res,await service.addStationMaintenance(req.body,req.auth?.userId),"Bakım planlandı.");}
export async function maintenanceStatusUpdate(req:Request,res:Response){return ok(res,await service.setMaintenanceStatus(Number(req.params.id),req.body.status),"Bakım durumu güncellendi.");}
export async function uptimeReport(req:Request,res:Response){return ok(res,await service.getStationUptime(req.query.days?Number(req.query.days):30));}
export async function revenueReport(req:Request,res:Response){return ok(res,await service.getCorsRevenue(req.query.months?Number(req.query.months):12));}
export async function notificationsIndex(req:Request,res:Response){await syncDeviceMaintenanceNotifications();return ok(res,await service.getNotifications(req.query.limit?Number(req.query.limit):100));}
export async function notificationsSummary(_req:Request,res:Response){await syncDeviceMaintenanceNotifications();return ok(res,await service.getNotificationSummary());}
export async function notificationRead(req:Request,res:Response){return ok(res,await service.readNotification(Number(req.params.id)));}
export async function notificationsReadAll(_req:Request,res:Response){return ok(res,await service.readAllNotifications());}
