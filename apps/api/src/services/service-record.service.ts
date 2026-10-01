import {
  addServiceOperation,
  addServicePart,
  createServiceRecord,
  findServiceRecordById,
  findServiceRecords,
  updateServiceBilling,
  updateServiceRecordStatus,
  type ServiceBillingInput,
  type ServiceInput,
  type ServiceOperationInput,
  type ServicePartInput,
} from "../repositories/service-record.repository.js";

export const listServiceRecords=(status?:string)=>findServiceRecords(status);
export const getServiceRecord=(id:string)=>findServiceRecordById(Number(id));
export const addServiceRecord=(input:ServiceInput,userId?:number)=>createServiceRecord(input,userId);
export const changeServiceStatus=(id:string,status:string,userId?:number,note?:string)=>updateServiceRecordStatus(Number(id),status,userId,note);
export const createServiceOperation=(id:string,input:ServiceOperationInput,userId?:number)=>addServiceOperation(Number(id),input,userId);
export const createServicePart=(id:string,input:ServicePartInput,userId?:number)=>addServicePart(Number(id),input,userId);
export const changeServiceBilling=(id:string,input:ServiceBillingInput)=>updateServiceBilling(Number(id),input);
