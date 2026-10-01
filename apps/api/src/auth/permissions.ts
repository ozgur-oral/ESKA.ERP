export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_MANAGE: "customer.manage",

  SALES_VIEW: "sales.view",
  SALES_MANAGE: "sales.manage",
  SALES_APPROVE: "sales.approve",

  STOCK_VIEW: "stock.view",
  STOCK_MANAGE: "stock.manage",

  PURCHASE_VIEW: "purchase.view",
  PURCHASE_MANAGE: "purchase.manage",

  RENTAL_VIEW: "rental.view",
  RENTAL_MANAGE: "rental.manage",

  MAINTENANCE_VIEW: "maintenance.view",
  MAINTENANCE_MANAGE: "maintenance.manage",

  DOCUMENT_VIEW: "document.view",
  DOCUMENT_MANAGE: "document.manage",

  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  FINANCE_RISK_OVERRIDE: "finance.risk_override",

  SERVICE_VIEW: "service.view",
  SERVICE_MANAGE: "service.manage",

  SUPPORT_VIEW: "support.view",
  SUPPORT_MANAGE: "support.manage",

  CORS_VIEW: "cors.view",
  CORS_MANAGE: "cors.manage",

  PROJECT_VIEW: "project.view",
  PROJECT_MANAGE: "project.manage",

  TASK_VIEW: "task.view",
  TASK_MANAGE: "task.manage",

  CRM_VIEW: "crm.view",
  CRM_MANAGE: "crm.manage",

  COMMUNICATION_VIEW: "communication.view",
  COMMUNICATION_MANAGE: "communication.manage",

  REPORT_VIEW: "report.view",

  USER_VIEW: "user.view",
  USER_MANAGE: "user.manage",

  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",

  ORGANIZATION_VIEW: "organization.view",
  ORGANIZATION_MANAGE: "organization.manage",

  FIELD_VIEW: "field.view",
  FIELD_MANAGE: "field.manage",

  EXPENSE_VIEW: "expense.view",
  EXPENSE_MANAGE: "expense.manage",
  EXPENSE_APPROVE: "expense.approve",
} as const;

export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type RoleCode = string;
