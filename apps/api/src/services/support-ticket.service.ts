import { addTicketComment, assignTicket, createTicket, findTicketById, listTickets, ticketSummary, updateTicketStatus } from "../repositories/support-ticket.repository.js";
export const getTickets=(filters:any)=>listTickets(filters);
export const getTicket=(id:string)=>findTicketById(Number(id));
export const getTicketSummary=()=>ticketSummary();
export const openTicket=(input:any,userId?:number)=>createTicket({...input,customerId:Number(input.customerId),assignedUserId:input.assignedUserId?Number(input.assignedUserId):null,serviceRecordId:input.serviceRecordId?Number(input.serviceRecordId):null,deviceId:input.deviceId?Number(input.deviceId):null,corsSubscriptionId:input.corsSubscriptionId?Number(input.corsSubscriptionId):null},userId);
export const commentTicket=(id:string,input:any,userId?:number)=>addTicketComment(Number(id),input,userId);
export const changeTicketStatus=(id:string,status:string,resolution:string|undefined,userId?:number)=>updateTicketStatus(Number(id),status,resolution,userId);
export const changeTicketAssignment=(id:string,assignedUserId:number|null,department:string|undefined,userId?:number)=>assignTicket(Number(id),assignedUserId,department,userId);
