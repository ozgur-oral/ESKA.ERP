import { createCustomer, findCustomerById, findCustomers, updateCustomer, type CustomerInput } from "../repositories/customer.repository.js";
export const listCustomers = (query?: string) => findCustomers(query);
export const getCustomer = (id: string) => findCustomerById(Number(id));
export const addCustomer = (input: CustomerInput) => createCustomer(input);
export const editCustomer = (id: string, input: Partial<CustomerInput>) => updateCustomer(Number(id), input);
