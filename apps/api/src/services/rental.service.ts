import * as repo from "../repositories/rental.repository.js";
export const rentals=(s?:string,c?:string)=>repo.listRentals(s,c?Number(c):undefined);
export const rentalSummary=()=>repo.rentalSummary();
export const rental=(id:string)=>repo.findRental(Number(id));
export const rentalAvailableDevices=()=>repo.availableDevices();
export const addRental=(input:any,userId?:number)=>repo.createRental(input,userId);
export const deliverRental=(id:string,input:any,userId?:number)=>repo.deliverRental(Number(id),input,userId);
export const returnRental=(id:string,input:any,userId?:number)=>repo.returnRental(Number(id),input,userId);
export const depositUpdate=(id:string,status:string)=>repo.updateDeposit(Number(id),status);
export const billingPreview=(id:string)=>repo.rentalBillingPreview(Number(id));

export const cancelRental=(id:string,userId?:number)=>repo.cancelRental(Number(id),userId);
