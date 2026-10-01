import * as repo from "../repositories/cors-subscription.repository.js";
export const getCorsPackages=()=>repo.listPackages();
export const getCorsSubscriptions=repo.listSubscriptions;
export const getCorsSubscription=repo.getSubscription;
export const addCorsSubscription=repo.createSubscription;
export const renewCorsSubscription=repo.renewSubscription;
export const setCorsSubscriptionPayment=repo.updateSubscriptionPayment;
export const getCorsSubscriptionSummary=repo.subscriptionSummary;
