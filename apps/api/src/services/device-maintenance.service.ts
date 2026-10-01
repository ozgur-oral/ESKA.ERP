import * as repo from "../repositories/device-maintenance.repository.js";
export const getMaintenanceSummary=()=>repo.maintenanceSummary();
export const getDueDevices=(kind?:string,days?:number)=>repo.dueDevices(kind,days);
export const getMaintenance=(deviceId?:number,status?:string)=>repo.listMaintenance(deviceId,status);
export const getMaintenanceRecord=(id:number)=>repo.maintenanceById(id);
export const addMaintenance=(input:any,userId?:number)=>repo.createMaintenance(input,userId);
export const setMaintenanceStatus=(id:number,input:any,userId?:number)=>repo.updateMaintenanceStatus(id,input,userId);
export const getCalibrations=(deviceId?:number)=>repo.listCalibrations(deviceId);
export const addCalibration=(input:any,userId?:number)=>repo.createCalibration(input,userId);
export const finishCalibration=(id:number,input:any)=>repo.completeCalibration(id,input);
export const getCertificates=(deviceId?:number)=>repo.listCertificates(deviceId);
export const addCertificate=(input:any,userId?:number)=>repo.createCertificate(input,userId);
export const getDeviceMaintenance=(id:number)=>repo.deviceMaintenanceDetail(id);
export const syncDeviceMaintenanceNotifications=()=>repo.syncMaintenanceNotifications();

export const setDeviceMaintenanceSchedule=(id:number,input:any)=>repo.updateDeviceSchedule(id,input);
