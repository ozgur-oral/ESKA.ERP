import { createDevice,createProduct,findDeviceById,findDevices,findProductById,findProducts,findStockMovements,type ProductInput } from "../repositories/product.repository.js";
export const listProducts=(q?:string)=>findProducts(q);export const getProduct=(id:string)=>findProductById(Number(id));export const addProduct=(input:ProductInput)=>createProduct(input);export const listDevices=(p?:string,c?:string)=>findDevices(p?Number(p):undefined,c?Number(c):undefined);export const getDevice=(id:string)=>findDeviceById(Number(id));
export const addDevice = (
  productId: number,
  serialNumber: string,
  userId: number
) => createDevice(
  productId,
  serialNumber,
  userId
);export const listStockMovements=(p?:string,d?:string)=>findStockMovements(p?Number(p):undefined,d?Number(d):undefined);
