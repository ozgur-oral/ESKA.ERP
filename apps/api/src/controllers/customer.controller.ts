
import { recordAudit } from "../services/audit.service.js";
import type { Request, Response } from "express";
import {
  addCustomer,
  editCustomer,
  getCustomer,
  listCustomers,
} from "../services/customer.service.js";
import { ok } from "../utils/http.js";

export async function customersIndex(req: Request, res: Response) {
  return ok(
    res,
    await listCustomers(
      typeof req.query.q === "string"
        ? req.query.q
        : undefined
    )
  );
}

export async function customersShow(req: Request, res: Response) {
  const customerId = String(req.params.id);

  const customer = await getCustomer(customerId);

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Müşteri bulunamadı.",
    });
  }

  return ok(res, customer);
}

export async function customersCreate(req: Request, res: Response) {
  if (!req.body?.name?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Müşteri adı zorunludur.",
    });
  }

  const customer = await addCustomer(req.body);

  await recordAudit({
    action: "CREATE",
    module: "CUSTOMER",
    entityType: "customer",
    entityId: customer?.id,
    entityLabel: customer?.name,
    newValues: customer,
  });

  return res.status(201).json({
    success: true,
    message: "Müşteri oluşturuldu.",
    data: customer,
  });
}

export async function customersUpdate(req: Request, res: Response) {
  const customerId = String(req.params.id);

  const before = await getCustomer(customerId);

  const customer = await editCustomer(
    customerId,
    req.body ?? {}
  );

  if (customer) {
    await recordAudit({
      action: "UPDATE",
      module: "CUSTOMER",
      entityType: "customer",
      entityId: customerId,
      entityLabel: customer?.name,
      oldValues: before,
      newValues: customer,
    });
  }

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Müşteri bulunamadı.",
    });
  }

  return ok(res, customer, "Müşteri güncellendi.");
}