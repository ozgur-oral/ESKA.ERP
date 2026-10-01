import {
  convertQuoteToOrder,
  createQuote,
  deliverOrder,
  findOrder,
  findOrders,
  findQuote,
  findQuotes,
  requestQuoteInternalApproval,
  requestQuoteRiskOverride,
  decideQuoteInternalApproval,
  decideQuoteCustomerApproval,
  sendQuoteToCustomer,
  updateQuoteStatus,
  decideQuoteRiskOverride,
  type QuoteRiskOverrideDecision,
  type QuoteApprovalDecision,
  type QuoteCustomerDecision,
  type QuoteInput,
} from "../repositories/quote.repository.js";

export const listQuotes = (customerId?: string) =>
  findQuotes(
    customerId
      ? Number(customerId)
      : undefined
  );

export const getQuote = (id: string) =>
  findQuote(Number(id));

export const addQuote = (
  input: QuoteInput,
  userId?: number
) =>
  createQuote(
    input,
    userId
  );

export const setQuoteStatus = (
  id: string,
  status: string
) =>
  updateQuoteStatus(
    Number(id),
    status
  );

export const createOrderFromQuote = (
  id: string,
  userId?: number
) =>
  convertQuoteToOrder(
    Number(id),
    userId
  );

export const listOrders = (
  customerId?: string
) =>
  findOrders(
    customerId
      ? Number(customerId)
      : undefined
  );

export const getOrder = (id: string) =>
  findOrder(Number(id));

export const completeOrderDelivery = (
  id: string,
  input: {
    deliveryNote?: string | null;
    warrantyMonths?: number;
    deviceIds?: number[];
  },
  userId?: number
) =>
  deliverOrder(
    Number(id),
    input,
    userId
  );

export const requestQuoteApproval = (
  id: string,
  userId: number,
  requestNote?: string | null
) =>
  requestQuoteInternalApproval(
    Number(id),
    userId,
    requestNote
  );

export const decideQuoteApproval = (
  id: string,
  decision: QuoteApprovalDecision,
  userId: number,
  decisionNote?: string | null
) =>
  decideQuoteInternalApproval(
    Number(id),
    decision,
    userId,
    decisionNote
  );

export const sendApprovedQuoteToCustomer = (
  id: string,
  userId: number
) =>
  sendQuoteToCustomer(
    Number(id),
    userId
  );
export const decideCustomerQuoteApproval = (
  id: string,
  decision: QuoteCustomerDecision,
  userId: number,
  decisionNote?: string | null
) =>
  decideQuoteCustomerApproval(
    Number(id),
    decision,
    userId,
    decisionNote
  );
export const requestQuoteRiskApproval = (
  id: string,
  userId: number,
  requestNote?: string | null
) =>
  requestQuoteRiskOverride(
    Number(id),
    userId,
    requestNote
  );
export const decideQuoteRiskApproval = (
  id: string,
  decision: QuoteRiskOverrideDecision,
  userId: number,
  decisionNote?: string | null
) =>
  decideQuoteRiskOverride(
    Number(id),
    decision,
    userId,
    decisionNote
  );