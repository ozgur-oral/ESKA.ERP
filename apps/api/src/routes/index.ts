import {templates as communicationTemplates,outbox as communicationOutbox,summary as communicationSummary,enqueue as communicationEnqueue,retry as communicationRetry,process as communicationProcess} from "../controllers/communication.controller.js";
import {analytics as reportingAnalytics,topCustomers as reportingTopCustomers,projectProfitability as reportingProjectProfitability} from "../controllers/reporting.controller.js";
import {crmSummary,crmActivities,crmTimeline,crmFollowUps,crmActivityCreate,crmNoteCreate} from "../controllers/crm.controller.js";
import express, { Router } from "express";
import { customersCreate, customersIndex, customersShow, customersUpdate } from "../controllers/customer.controller.js";
import { serviceBillingUpdate, serviceOperationCreate, servicePartCreate, serviceRecordStatusUpdate, serviceRecordsCreate, serviceRecordsIndex, serviceRecordsShow } from "../controllers/service-record.controller.js";
import { corsStationsIndex, corsSummary } from "../controllers/cors.controller.js";
import { packagesIndex, subscriptionsIndex, subscriptionShow, subscriptionCreate, subscriptionRenew, subscriptionPaymentUpdate, subscriptionSummary } from "../controllers/cors-subscription.controller.js";
import { stationEventsIndex, stationEventCreate, maintenanceIndex, maintenanceCreate, maintenanceStatusUpdate, uptimeReport, revenueReport, notificationsIndex, notificationsSummary, notificationRead, notificationsReadAll } from "../controllers/cors-operations.controller.js";
import { dashboardSummary } from "../controllers/dashboard.controller.js";
import { login, logout, me } from "../controllers/auth.controller.js";
import { rolesIndex, usersIndex, userCreate, userUpdate, userPassword } from "../controllers/user.controller.js";
import {permissionIndex,roleCreate,rolePermissions,roleStatus} from "../controllers/rbac.controller.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { rateLimit } from "../middleware/security.js";
import { PERMISSIONS } from "../auth/permissions.js";
import { devicesCreate, devicesIndex, devicesShow, productsCreate, productsIndex, productsShow, stockMovementsIndex } from "../controllers/product.controller.js";
import {
  orderDeliver,
  ordersIndex,
  ordersShow,
  quoteApprovalDecision,
  quoteApprovalRequest,
  quoteConvert,
  quoteRiskOverrideDecision,
  quoteCustomerDecision,
  quoteSendToCustomer,
  quoteRiskOverrideRequest,
  quoteStatusUpdate,
  quotesCreate,
  quotesIndex,
  quotesShow,
} from "../controllers/quote.controller.js";
import { supportAgents, ticketAssignmentUpdate, ticketCommentCreate, ticketCreate, ticketShow, ticketStatusUpdate, ticketsIndex, ticketsSummary } from "../controllers/support-ticket.controller.js";
import { assigneesIndex, taskCreate, taskShow, taskUpdate, tasksIndex, tasksSummary } from "../controllers/work-task.controller.js";
import { projectAssignmentCreate, projectCompanies, projectCreate, projectMilestoneCreate, projectsIndex, projectsSummary, projectShow, projectTaskCreate, projectTaskUpdate } from "../controllers/project.controller.js";
import { financeAccountCreate, financeAccounts, financeCustomerLedger, financeCustomerRisk, financeDocuments, financeReceivableAging, financeRiskNotifications, financeSettle, financeSummary, financeSupplierLedger, financeSync, financeTransactions } from "../controllers/finance.controller.js";
import { criticalStockIndex, goodsReceiptCreate, purchaseOrderCreate, purchaseOrdersIndex, purchaseOrderShow, purchaseRequestCreate, purchaseRequestsIndex, purchaseRequestStatus, supplierCreate, suppliersIndex, supplierQuoteCreate, supplierQuotesIndex, supplierQuoteSelect, supplierQuoteConvert } from "../controllers/purchasing.controller.js";
import { invoicesIndex, invoiceShow, invoiceSourceSync, invoicePushParasut, parasutStatus, parasutTest, parasutLogs, financeTransactionPushParasut, financeVatReport, parasutAccountMappings, parasutAccountMappingSave, eDocumentReadiness, invoiceQueueParasut, financeTransactionQueueParasut, parasutQueue, parasutQueueSummary, parasutQueueProcess, parasutQueueRetry } from "../controllers/invoice.controller.js";

import { maintenanceSummary as deviceMaintenanceSummary, maintenanceDue as deviceMaintenanceDue, maintenanceIndex as deviceMaintenanceIndex, maintenanceShow as deviceMaintenanceRecordShow, maintenanceCreate as deviceMaintenanceCreate, maintenanceStatus as deviceMaintenanceStatus, calibrationsIndex, calibrationCreate, calibrationComplete, certificatesIndex, certificateCreate, deviceMaintenanceShow, maintenanceNotificationSync, deviceMaintenanceSchedule } from "../controllers/device-maintenance.controller.js";

import { rentalBilling, rentalCancel, rentalCreate, rentalDeliver, rentalDeposit, rentalDevices, rentalReturn, rentalsIndex, rentalsSummary, rentalShow } from "../controllers/rental.controller.js";

import { globalSearchIndex } from "../controllers/global-search.controller.js";
import {expenseIndex,expenseSummary,expenseCreate,expenseStatus,projectCost} from "../controllers/field-expenses.controller.js";
import {resourceIndex,resourceAvailable,resourceSummary,resourceCreate,resourceStatus} from "../controllers/field-resources.controller.js";
import {fieldIndex,fieldSummary,fieldAvailable,fieldCreate,fieldStatus} from "../controllers/field-operations.controller.js";
import {orgSummary,orgCompanies,orgDepartments,orgEmployees,orgEmployee,orgEmployeeCreate,orgAssignmentCreate,hrOperationalSummary,employeeAvailability,employeeLeaves,employeeLeaveCreate,leaveStatus,employeeCertifications,employeeCertificationCreate,employeeTrainings,employeeTrainingCreate} from "../controllers/organization.controller.js";
import { auditIndex, auditSummaryIndex } from "../controllers/audit.controller.js";

import { documentAccess, documentCategories, documentCreate, documentDownload, documentLinkCreate, documentLinkDelete, documentsIndex, documentShow, documentStatus, documentSummary, documentUpload } from "../controllers/document.controller.js";



export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ success: true, message: "ESKA.ERP API çalışıyor" }));
apiRouter.post("/auth/login", rateLimit({windowMs:60_000,max:Number(process.env.LOGIN_RATE_LIMIT_PER_MINUTE??10)}), login);

apiRouter.use(authenticate);

apiRouter.get("/crm/summary",requirePermission(PERMISSIONS.CRM_VIEW),crmSummary);
apiRouter.get("/crm/activities",requirePermission(PERMISSIONS.CRM_VIEW),crmActivities);
apiRouter.get("/crm/follow-ups",requirePermission(PERMISSIONS.CRM_VIEW),crmFollowUps);
apiRouter.post("/crm/activities",requirePermission(PERMISSIONS.CRM_MANAGE),crmActivityCreate);
apiRouter.get("/customers/:id/timeline",requirePermission(PERMISSIONS.CRM_VIEW),crmTimeline);
apiRouter.post("/customers/:id/notes",requirePermission(PERMISSIONS.CRM_MANAGE),crmNoteCreate);

apiRouter.get("/communications/templates",requirePermission(PERMISSIONS.COMMUNICATION_VIEW),communicationTemplates);
apiRouter.get("/communications/outbox",requirePermission(PERMISSIONS.COMMUNICATION_VIEW),communicationOutbox);
apiRouter.get("/communications/summary",requirePermission(PERMISSIONS.COMMUNICATION_VIEW),communicationSummary);
apiRouter.post("/communications/outbox",requirePermission(PERMISSIONS.COMMUNICATION_MANAGE),communicationEnqueue);
apiRouter.post("/communications/outbox/:id/retry",requirePermission(PERMISSIONS.COMMUNICATION_MANAGE),communicationRetry);
apiRouter.post("/communications/process",requirePermission(PERMISSIONS.COMMUNICATION_MANAGE),communicationProcess);

apiRouter.get("/reports/analytics",requirePermission(PERMISSIONS.REPORT_VIEW),reportingAnalytics);
apiRouter.get("/reports/top-customers",requirePermission(PERMISSIONS.REPORT_VIEW),reportingTopCustomers);
apiRouter.get("/reports/project-profitability",requirePermission(PERMISSIONS.REPORT_VIEW),reportingProjectProfitability);


apiRouter.get("/auth/me", me);
apiRouter.post("/auth/logout", logout);
apiRouter.get("/search", globalSearchIndex);
apiRouter.get("/dashboard/summary", requirePermission(PERMISSIONS.DASHBOARD_VIEW), dashboardSummary);
apiRouter.get("/audit", requirePermission(PERMISSIONS.AUDIT_VIEW), auditIndex);
apiRouter.get("/audit/summary", requirePermission(PERMISSIONS.AUDIT_VIEW), auditSummaryIndex);
apiRouter.get("/field-operations",requirePermission(PERMISSIONS.FIELD_VIEW),fieldIndex);
apiRouter.get("/field-operations/summary",requirePermission(PERMISSIONS.FIELD_VIEW),fieldSummary);
apiRouter.get("/field-operations/available-employees",requirePermission(PERMISSIONS.FIELD_VIEW),fieldAvailable);
apiRouter.post("/field-operations",requirePermission(PERMISSIONS.FIELD_MANAGE),fieldCreate);
apiRouter.patch("/field-operations/:id/status",requirePermission(PERMISSIONS.FIELD_MANAGE),fieldStatus);
apiRouter.get("/field-resources",requirePermission(PERMISSIONS.FIELD_VIEW),resourceIndex);
apiRouter.get("/field-resources/summary",requirePermission(PERMISSIONS.FIELD_VIEW),resourceSummary);
apiRouter.get("/field-resources/available",requirePermission(PERMISSIONS.FIELD_VIEW),resourceAvailable);
apiRouter.post("/field-resources",requirePermission(PERMISSIONS.FIELD_MANAGE),resourceCreate);
apiRouter.patch("/field-resources/:id/status",requirePermission(PERMISSIONS.FIELD_MANAGE),resourceStatus);
apiRouter.get("/field-expenses",requirePermission(PERMISSIONS.EXPENSE_VIEW),expenseIndex);
apiRouter.get("/field-expenses/summary",requirePermission(PERMISSIONS.EXPENSE_VIEW),expenseSummary);
apiRouter.post("/field-expenses",requirePermission(PERMISSIONS.EXPENSE_MANAGE),expenseCreate);
apiRouter.patch("/field-expenses/:id/status",requirePermission(PERMISSIONS.EXPENSE_APPROVE),expenseStatus);
apiRouter.get("/projects/:id/cost-summary",requirePermission(PERMISSIONS.EXPENSE_VIEW),projectCost);
apiRouter.get("/organization/summary",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),orgSummary);
apiRouter.get("/organization/companies",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),orgCompanies);
apiRouter.get("/organization/departments",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),orgDepartments);
apiRouter.get("/organization/employees",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),orgEmployees);
apiRouter.get("/organization/employees/:id",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),orgEmployee);
apiRouter.post("/organization/employees",requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),orgEmployeeCreate);
apiRouter.post("/organization/employees/:id/assignments",requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),orgAssignmentCreate);
apiRouter.get("/organization/hr/summary",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),hrOperationalSummary);
apiRouter.get("/organization/employees/:id/availability",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),employeeAvailability);
apiRouter.get("/organization/employees/:id/leaves",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),employeeLeaves);
apiRouter.post("/organization/employees/:id/leaves",requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),employeeLeaveCreate);
apiRouter.patch("/organization/leaves/:id/status",requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),leaveStatus);
apiRouter.get("/organization/employees/:id/certifications",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),employeeCertifications);
apiRouter.post("/organization/employees/:id/certifications",requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),employeeCertificationCreate);
apiRouter.get("/organization/employees/:id/trainings",requirePermission(PERMISSIONS.ORGANIZATION_VIEW),employeeTrainings);
apiRouter.post("/organization/employees/:id/trainings",requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),employeeTrainingCreate);
apiRouter.get("/customers", requirePermission(PERMISSIONS.CUSTOMER_VIEW), customersIndex);
apiRouter.get("/customers/:id", requirePermission(PERMISSIONS.CUSTOMER_VIEW), customersShow);
apiRouter.post("/customers", requirePermission(PERMISSIONS.CUSTOMER_MANAGE), customersCreate);
apiRouter.patch("/customers/:id", requirePermission(PERMISSIONS.CUSTOMER_MANAGE), customersUpdate);
apiRouter.get("/service-records", requirePermission(PERMISSIONS.SERVICE_VIEW), serviceRecordsIndex);
apiRouter.get("/service-records/:id", requirePermission(PERMISSIONS.SERVICE_VIEW), serviceRecordsShow);
apiRouter.post("/service-records", requirePermission(PERMISSIONS.SERVICE_MANAGE), serviceRecordsCreate);
apiRouter.patch("/service-records/:id/status", requirePermission(PERMISSIONS.SERVICE_MANAGE), serviceRecordStatusUpdate);
apiRouter.post("/service-records/:id/operations", requirePermission(PERMISSIONS.SERVICE_MANAGE), serviceOperationCreate);
apiRouter.post("/service-records/:id/parts", requirePermission(PERMISSIONS.SERVICE_MANAGE), servicePartCreate);
apiRouter.patch("/service-records/:id/billing", requirePermission(PERMISSIONS.SERVICE_MANAGE), serviceBillingUpdate);

apiRouter.get("/documents/summary", requirePermission(PERMISSIONS.DOCUMENT_VIEW), documentSummary);
apiRouter.get("/documents/categories", requirePermission(PERMISSIONS.DOCUMENT_VIEW), documentCategories);
apiRouter.get("/documents", requirePermission(PERMISSIONS.DOCUMENT_VIEW), documentsIndex);
apiRouter.get("/documents/:id", requirePermission(PERMISSIONS.DOCUMENT_VIEW), documentShow);
apiRouter.post("/documents", requirePermission(PERMISSIONS.DOCUMENT_MANAGE), documentCreate);
apiRouter.post("/documents/:id/links", requirePermission(PERMISSIONS.DOCUMENT_MANAGE), documentLinkCreate);
apiRouter.delete("/documents/:id/links/:linkId", requirePermission(PERMISSIONS.DOCUMENT_MANAGE), documentLinkDelete);
apiRouter.patch("/documents/:id/status", requirePermission(PERMISSIONS.DOCUMENT_MANAGE), documentStatus);
apiRouter.put("/documents/:id/access", requirePermission(PERMISSIONS.DOCUMENT_MANAGE), documentAccess);
apiRouter.post("/documents/:id/versions/upload", requirePermission(PERMISSIONS.DOCUMENT_MANAGE), express.raw({type:"*/*",limit:`${process.env.DOCUMENT_MAX_FILE_SIZE_MB||25}mb`}), documentUpload);
apiRouter.get("/documents/versions/:versionId/download", requirePermission(PERMISSIONS.DOCUMENT_VIEW), documentDownload);
apiRouter.get("/maintenance/summary", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), deviceMaintenanceSummary);
apiRouter.get("/maintenance/due", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), deviceMaintenanceDue);
apiRouter.get("/maintenance/records", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), deviceMaintenanceIndex);
apiRouter.get("/maintenance/records/:id", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), deviceMaintenanceRecordShow);
apiRouter.post("/maintenance/records", requirePermission(PERMISSIONS.MAINTENANCE_MANAGE), deviceMaintenanceCreate);
apiRouter.patch("/maintenance/records/:id/status", requirePermission(PERMISSIONS.MAINTENANCE_MANAGE), deviceMaintenanceStatus);
apiRouter.get("/maintenance/calibrations", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), calibrationsIndex);
apiRouter.post("/maintenance/calibrations", requirePermission(PERMISSIONS.MAINTENANCE_MANAGE), calibrationCreate);
apiRouter.patch("/maintenance/calibrations/:id/complete", requirePermission(PERMISSIONS.MAINTENANCE_MANAGE), calibrationComplete);
apiRouter.get("/maintenance/certificates", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), certificatesIndex);
apiRouter.post("/maintenance/certificates", requirePermission(PERMISSIONS.MAINTENANCE_MANAGE), certificateCreate);
apiRouter.get("/maintenance/devices/:id", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), deviceMaintenanceShow);
apiRouter.patch("/maintenance/devices/:id/schedule", requirePermission(PERMISSIONS.MAINTENANCE_MANAGE), deviceMaintenanceSchedule);
apiRouter.post("/maintenance/notifications/sync", requirePermission(PERMISSIONS.MAINTENANCE_VIEW), maintenanceNotificationSync);
apiRouter.get("/rentals/summary", requirePermission(PERMISSIONS.RENTAL_VIEW), rentalsSummary);
apiRouter.get("/rentals/available-devices", requirePermission(PERMISSIONS.RENTAL_VIEW), rentalDevices);
apiRouter.get("/rentals", requirePermission(PERMISSIONS.RENTAL_VIEW), rentalsIndex);
apiRouter.get("/rentals/:id", requirePermission(PERMISSIONS.RENTAL_VIEW), rentalShow);
apiRouter.get("/rentals/:id/billing-preview", requirePermission(PERMISSIONS.RENTAL_VIEW), rentalBilling);
apiRouter.post("/rentals", requirePermission(PERMISSIONS.RENTAL_MANAGE), rentalCreate);
apiRouter.post("/rentals/:id/deliver", requirePermission(PERMISSIONS.RENTAL_MANAGE), rentalDeliver);
apiRouter.post("/rentals/:id/return", requirePermission(PERMISSIONS.RENTAL_MANAGE), rentalReturn);
apiRouter.post("/rentals/:id/cancel", requirePermission(PERMISSIONS.RENTAL_MANAGE), rentalCancel);
apiRouter.patch("/rentals/:id/deposit", requirePermission(PERMISSIONS.RENTAL_MANAGE), rentalDeposit);
apiRouter.get("/tasks/summary", requirePermission(PERMISSIONS.TASK_VIEW), tasksSummary);
apiRouter.get("/tasks/assignees", requirePermission(PERMISSIONS.TASK_VIEW), assigneesIndex);
apiRouter.get("/tasks", requirePermission(PERMISSIONS.TASK_VIEW), tasksIndex);
apiRouter.get("/tasks/:id", requirePermission(PERMISSIONS.TASK_VIEW), taskShow);
apiRouter.post("/tasks", requirePermission(PERMISSIONS.TASK_MANAGE), taskCreate);
apiRouter.patch("/tasks/:id", requirePermission(PERMISSIONS.TASK_MANAGE), taskUpdate);
apiRouter.get("/projects/companies", requirePermission(PERMISSIONS.PROJECT_VIEW), projectCompanies);
apiRouter.get("/projects/summary", requirePermission(PERMISSIONS.PROJECT_VIEW), projectsSummary);
apiRouter.get("/projects", requirePermission(PERMISSIONS.PROJECT_VIEW), projectsIndex);
apiRouter.get("/projects/:id", requirePermission(PERMISSIONS.PROJECT_VIEW), projectShow);
apiRouter.post("/projects", requirePermission(PERMISSIONS.PROJECT_MANAGE), projectCreate);
apiRouter.post("/projects/:id/tasks", requirePermission(PERMISSIONS.PROJECT_MANAGE), projectTaskCreate);
apiRouter.patch("/projects/tasks/:taskId", requirePermission(PERMISSIONS.PROJECT_MANAGE), projectTaskUpdate);
apiRouter.post("/projects/:id/assignments", requirePermission(PERMISSIONS.PROJECT_MANAGE), projectAssignmentCreate);
apiRouter.post("/projects/:id/milestones", requirePermission(PERMISSIONS.PROJECT_MANAGE), projectMilestoneCreate);
apiRouter.get("/support/tickets", requirePermission(PERMISSIONS.SUPPORT_VIEW), ticketsIndex);
apiRouter.get("/support/tickets/summary", requirePermission(PERMISSIONS.SUPPORT_VIEW), ticketsSummary);
apiRouter.get("/support/agents", requirePermission(PERMISSIONS.SUPPORT_VIEW), supportAgents);
apiRouter.get("/support/tickets/:id", requirePermission(PERMISSIONS.SUPPORT_VIEW), ticketShow);
apiRouter.post("/support/tickets", requirePermission(PERMISSIONS.SUPPORT_MANAGE), ticketCreate);
apiRouter.post("/support/tickets/:id/comments", requirePermission(PERMISSIONS.SUPPORT_MANAGE), ticketCommentCreate);
apiRouter.patch("/support/tickets/:id/status", requirePermission(PERMISSIONS.SUPPORT_MANAGE), ticketStatusUpdate);
apiRouter.patch("/support/tickets/:id/assignment", requirePermission(PERMISSIONS.SUPPORT_MANAGE), ticketAssignmentUpdate);
apiRouter.get("/cors/stations", requirePermission(PERMISSIONS.CORS_VIEW), corsStationsIndex);
apiRouter.get("/cors/summary", requirePermission(PERMISSIONS.CORS_VIEW), corsSummary);
apiRouter.get("/cors/packages", requirePermission(PERMISSIONS.CORS_VIEW), packagesIndex);
apiRouter.get("/cors/subscriptions", requirePermission(PERMISSIONS.CORS_VIEW), subscriptionsIndex);
apiRouter.get("/cors/subscriptions/summary", requirePermission(PERMISSIONS.CORS_VIEW), subscriptionSummary);
apiRouter.get("/cors/subscriptions/:id", requirePermission(PERMISSIONS.CORS_VIEW), subscriptionShow);
apiRouter.post("/cors/subscriptions", requirePermission(PERMISSIONS.CORS_MANAGE), subscriptionCreate);
apiRouter.post("/cors/subscriptions/:id/renew", requirePermission(PERMISSIONS.CORS_MANAGE), subscriptionRenew);
apiRouter.patch("/cors/subscriptions/:id/payment", requirePermission(PERMISSIONS.CORS_MANAGE), subscriptionPaymentUpdate);
apiRouter.get("/cors/events", requirePermission(PERMISSIONS.CORS_VIEW), stationEventsIndex);
apiRouter.post("/cors/events", requirePermission(PERMISSIONS.CORS_MANAGE), stationEventCreate);
apiRouter.get("/cors/maintenance", requirePermission(PERMISSIONS.CORS_VIEW), maintenanceIndex);
apiRouter.post("/cors/maintenance", requirePermission(PERMISSIONS.CORS_MANAGE), maintenanceCreate);
apiRouter.patch("/cors/maintenance/:id/status", requirePermission(PERMISSIONS.CORS_MANAGE), maintenanceStatusUpdate);
apiRouter.get("/cors/reports/uptime", requirePermission(PERMISSIONS.CORS_VIEW), uptimeReport);
apiRouter.get("/cors/reports/revenue", requirePermission(PERMISSIONS.REPORT_VIEW), revenueReport);
apiRouter.get("/notifications", notificationsIndex);
apiRouter.get("/notifications/summary", notificationsSummary);
apiRouter.patch("/notifications/:id/read", notificationRead);
apiRouter.post("/notifications/read-all", notificationsReadAll);
apiRouter.get("/users", requirePermission(PERMISSIONS.USER_VIEW), usersIndex);
apiRouter.get("/roles", requirePermission(PERMISSIONS.USER_VIEW), rolesIndex);
apiRouter.get("/permissions", requirePermission(PERMISSIONS.USER_VIEW), permissionIndex);
apiRouter.post("/roles", requirePermission(PERMISSIONS.USER_MANAGE), roleCreate);
apiRouter.put("/roles/:code/permissions", requirePermission(PERMISSIONS.USER_MANAGE), rolePermissions);
apiRouter.patch("/roles/:code/status", requirePermission(PERMISSIONS.USER_MANAGE), roleStatus);
apiRouter.post("/users", requirePermission(PERMISSIONS.USER_MANAGE), userCreate);
apiRouter.patch("/users/:id", requirePermission(PERMISSIONS.USER_MANAGE), userUpdate);
apiRouter.patch("/users/:id/password", requirePermission(PERMISSIONS.USER_MANAGE), userPassword);

apiRouter.get("/finance/summary", requirePermission(PERMISSIONS.FINANCE_VIEW), financeSummary);
apiRouter.get("/finance/documents", requirePermission(PERMISSIONS.FINANCE_VIEW), financeDocuments);
apiRouter.get("/finance/accounts", requirePermission(PERMISSIONS.FINANCE_VIEW), financeAccounts);
apiRouter.post("/finance/accounts", requirePermission(PERMISSIONS.FINANCE_MANAGE), financeAccountCreate);
apiRouter.get("/finance/transactions", requirePermission(PERMISSIONS.FINANCE_VIEW), financeTransactions);
apiRouter.post("/finance/documents/:id/settle", requirePermission(PERMISSIONS.FINANCE_MANAGE), financeSettle);
apiRouter.get("/finance/customers/:id", requirePermission(PERMISSIONS.FINANCE_VIEW), financeCustomerLedger);
apiRouter.get("/finance/suppliers/:id", requirePermission(PERMISSIONS.FINANCE_VIEW), financeSupplierLedger);
apiRouter.post("/finance/sync", requirePermission(PERMISSIONS.FINANCE_MANAGE), financeSync);
apiRouter.get("/finance/risk/customers/:id", requirePermission(PERMISSIONS.SALES_VIEW), financeCustomerRisk);
apiRouter.get("/finance/reports/receivable-aging", requirePermission(PERMISSIONS.FINANCE_VIEW), financeReceivableAging);
apiRouter.post("/finance/risk/notifications/sync", requirePermission(PERMISSIONS.FINANCE_MANAGE), financeRiskNotifications);
apiRouter.get("/finance/invoices", requirePermission(PERMISSIONS.FINANCE_VIEW), invoicesIndex);
apiRouter.get("/finance/invoices/:id", requirePermission(PERMISSIONS.FINANCE_VIEW), invoiceShow);
apiRouter.post("/finance/invoices/sync-sources", requirePermission(PERMISSIONS.FINANCE_MANAGE), invoiceSourceSync);
apiRouter.post("/finance/invoices/:id/push-parasut", requirePermission(PERMISSIONS.FINANCE_MANAGE), invoicePushParasut);
apiRouter.get("/finance/integrations/parasut/status", requirePermission(PERMISSIONS.FINANCE_VIEW), parasutStatus);
apiRouter.post("/finance/integrations/parasut/test", requirePermission(PERMISSIONS.FINANCE_MANAGE), parasutTest);
apiRouter.get("/finance/integrations/parasut/logs", requirePermission(PERMISSIONS.FINANCE_VIEW), parasutLogs);
apiRouter.post("/finance/transactions/:id/push-parasut", requirePermission(PERMISSIONS.FINANCE_MANAGE), financeTransactionPushParasut);
apiRouter.get("/finance/reports/vat", requirePermission(PERMISSIONS.FINANCE_VIEW), financeVatReport);
apiRouter.get("/finance/integrations/parasut/account-mappings", requirePermission(PERMISSIONS.FINANCE_VIEW), parasutAccountMappings);
apiRouter.patch("/finance/integrations/parasut/account-mappings/:id", requirePermission(PERMISSIONS.FINANCE_MANAGE), parasutAccountMappingSave);
apiRouter.get("/finance/e-documents/readiness", requirePermission(PERMISSIONS.FINANCE_VIEW), eDocumentReadiness);
apiRouter.post("/finance/invoices/:id/queue-parasut", requirePermission(PERMISSIONS.FINANCE_MANAGE), invoiceQueueParasut);
apiRouter.post("/finance/transactions/:id/queue-parasut", requirePermission(PERMISSIONS.FINANCE_MANAGE), financeTransactionQueueParasut);
apiRouter.get("/finance/integrations/parasut/queue", requirePermission(PERMISSIONS.FINANCE_VIEW), parasutQueue);
apiRouter.get("/finance/integrations/parasut/queue-summary", requirePermission(PERMISSIONS.FINANCE_VIEW), parasutQueueSummary);
apiRouter.post("/finance/integrations/parasut/queue/process", requirePermission(PERMISSIONS.FINANCE_MANAGE), parasutQueueProcess);
apiRouter.post("/finance/integrations/parasut/queue/:id/retry", requirePermission(PERMISSIONS.FINANCE_MANAGE), parasutQueueRetry);

apiRouter.get("/purchasing/critical-stock", requirePermission(PERMISSIONS.PURCHASE_VIEW), criticalStockIndex);
apiRouter.get("/suppliers", requirePermission(PERMISSIONS.PURCHASE_VIEW), suppliersIndex);
apiRouter.post("/suppliers", requirePermission(PERMISSIONS.PURCHASE_MANAGE), supplierCreate);
apiRouter.get("/purchase-requests", requirePermission(PERMISSIONS.PURCHASE_VIEW), purchaseRequestsIndex);
apiRouter.post("/purchase-requests", requirePermission(PERMISSIONS.PURCHASE_MANAGE), purchaseRequestCreate);
apiRouter.patch("/purchase-requests/:id/status", requirePermission(PERMISSIONS.PURCHASE_MANAGE), purchaseRequestStatus);
apiRouter.get("/supplier-quotes", requirePermission(PERMISSIONS.PURCHASE_VIEW), supplierQuotesIndex);
apiRouter.post("/supplier-quotes", requirePermission(PERMISSIONS.PURCHASE_MANAGE), supplierQuoteCreate);
apiRouter.patch("/supplier-quotes/:id/select", requirePermission(PERMISSIONS.PURCHASE_MANAGE), supplierQuoteSelect);
apiRouter.post("/supplier-quotes/:id/convert-to-order", requirePermission(PERMISSIONS.PURCHASE_MANAGE), supplierQuoteConvert);
apiRouter.get("/purchase-orders", requirePermission(PERMISSIONS.PURCHASE_VIEW), purchaseOrdersIndex);
apiRouter.get("/purchase-orders/:id", requirePermission(PERMISSIONS.PURCHASE_VIEW), purchaseOrderShow);
apiRouter.post("/purchase-orders", requirePermission(PERMISSIONS.PURCHASE_MANAGE), purchaseOrderCreate);
apiRouter.post("/purchase-orders/:id/receive", requirePermission(PERMISSIONS.PURCHASE_MANAGE), goodsReceiptCreate);
apiRouter.get("/products", requirePermission(PERMISSIONS.STOCK_VIEW), productsIndex);
apiRouter.get("/products/:id", requirePermission(PERMISSIONS.STOCK_VIEW), productsShow);
apiRouter.post("/products", requirePermission(PERMISSIONS.STOCK_MANAGE), productsCreate);
apiRouter.get("/inventory/devices", requirePermission(PERMISSIONS.STOCK_VIEW), devicesIndex);
apiRouter.get("/inventory/devices/:id", requirePermission(PERMISSIONS.STOCK_VIEW), devicesShow);
apiRouter.post("/inventory/devices", requirePermission(PERMISSIONS.STOCK_MANAGE), devicesCreate);
apiRouter.get("/stock/movements", requirePermission(PERMISSIONS.STOCK_VIEW), stockMovementsIndex);
apiRouter.get("/quotes", requirePermission(PERMISSIONS.SALES_VIEW), quotesIndex);
apiRouter.get("/quotes/:id", requirePermission(PERMISSIONS.SALES_VIEW), quotesShow);
apiRouter.post("/quotes", requirePermission(PERMISSIONS.SALES_MANAGE), quotesCreate);
apiRouter.post(
  "/quotes/:id/request-approval",
  requirePermission(PERMISSIONS.SALES_MANAGE),
  quoteApprovalRequest
);
apiRouter.post(
  "/quotes/:id/approval-decision",
  requirePermission(PERMISSIONS.SALES_APPROVE),
  quoteApprovalDecision
);
apiRouter.post(
  "/quotes/:id/send-to-customer",
  requirePermission(PERMISSIONS.SALES_MANAGE),
  quoteSendToCustomer
);
apiRouter.post(
  "/quotes/:id/customer-decision",
  requirePermission(PERMISSIONS.SALES_MANAGE),
  quoteCustomerDecision
);
apiRouter.post(
  "/quotes/:id/request-risk-override",
  requirePermission(PERMISSIONS.SALES_MANAGE),
  quoteRiskOverrideRequest
);
apiRouter.post(
  "/quotes/:id/risk-override-decision",
  requirePermission(
    PERMISSIONS.FINANCE_RISK_OVERRIDE
  ),
  quoteRiskOverrideDecision
);
apiRouter.patch("/quotes/:id/status", requirePermission(PERMISSIONS.SALES_MANAGE), quoteStatusUpdate);
apiRouter.post("/quotes/:id/convert-to-order", requirePermission(PERMISSIONS.SALES_MANAGE), quoteConvert);
apiRouter.get("/orders", requirePermission(PERMISSIONS.SALES_VIEW), ordersIndex);
apiRouter.get("/orders/:id", requirePermission(PERMISSIONS.SALES_VIEW), ordersShow);
apiRouter.post("/orders/:id/deliver", requirePermission(PERMISSIONS.SALES_MANAGE), orderDeliver);
