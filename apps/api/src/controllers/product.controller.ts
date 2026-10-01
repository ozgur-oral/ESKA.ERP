
import type { Request, Response } from "express";

import {
  addDevice,
  addProduct,
  getDevice,
  getProduct,
  listDevices,
  listProducts,
  listStockMovements,
} from "../services/product.service.js";

import { ok } from "../utils/http.js";
import { routeParam } from "../utils/route-param.js";

export async function productsIndex(req: Request, res: Response) {
  return ok(
    res,
    await listProducts(
      typeof req.query.q === "string"
        ? req.query.q
        : undefined
    )
  );
}

export async function productsShow(req: Request, res: Response) {
  const productId = routeParam(req.params.id);

  const product = await getProduct(productId);

  return product
    ? ok(res, product)
    : res.status(404).json({
        success: false,
        message: "Ürün bulunamadı.",
      });
}

export async function productsCreate(req: Request, res: Response) {
  if (!req.body?.name?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Ürün adı zorunludur.",
    });
  }

  return res.status(201).json({
    success: true,
    data: await addProduct(req.body),
    message: "Ürün oluşturuldu.",
  });
}

export async function devicesIndex(req: Request, res: Response) {
  return ok(
    res,
    await listDevices(
      typeof req.query.productId === "string"
        ? req.query.productId
        : undefined,
      typeof req.query.customerId === "string"
        ? req.query.customerId
        : undefined
    )
  );
}

export async function devicesShow(req: Request, res: Response) {
  const deviceId = routeParam(req.params.id);

  const device = await getDevice(deviceId);

  return device
    ? ok(res, device)
    : res.status(404).json({
        success: false,
        message: "Cihaz bulunamadı.",
      });
}


export async function devicesCreate(req: Request, res: Response) {
  if (
    !req.body?.productId ||
    typeof req.body?.serialNumber !== "string" ||
    !req.body.serialNumber.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Ürün ve seri numarası zorunludur.",
    });
  }

  // Oturum açmış kullanıcının ID bilgisini al
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Oturum açmanız gerekiyor.",
    });
  }

  // Cihazı oluştur ve kullanıcı ID bilgisini servise aktar
  const device = await addDevice(
    Number(req.body.productId),
    req.body.serialNumber,
    userId
  );

  return res.status(201).json({
    success: true,
    data: device,
    message: "Cihaz stoğa eklendi.",
  });
}

export async function stockMovementsIndex(req: Request, res: Response) {
  return ok(
    res,
    await listStockMovements(
      typeof req.query.productId === "string"
        ? req.query.productId
        : undefined,
      typeof req.query.deviceId === "string"
        ? req.query.deviceId
        : undefined
    )
  );
}