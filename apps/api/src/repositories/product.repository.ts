import { pool, query } from "../db/pool.js";

export type ProductRow = {id:number;sku:string;name:string;brand:string|null;category:string|null;unit:string;salePrice:string|null;vatRate:string;criticalStock:number;isSerialized:boolean;stockQuantity:string;status:"ACTIVE"|"PASSIVE";createdAt:Date;updatedAt:Date;deviceStock?:number};
export type ProductInput = {sku?:string;name:string;brand?:string|null;category?:string|null;unit?:string;salePrice?:number|null;vatRate?:number;criticalStock?:number;isSerialized?:boolean;stockQuantity?:number;status?:"ACTIVE"|"PASSIVE"};
export async function findProducts(search?:string){const q=search?.trim();const values=q?[`%${q}%`]:[];const where=q?`WHERE p."name" ILIKE $1 OR p."sku" ILIKE $1 OR COALESCE(p."brand",'') ILIKE $1`:``;const r=await query<ProductRow>(`SELECT p.*, COUNT(d.id) FILTER (WHERE d.status='IN_STOCK')::int AS "deviceStock" FROM "product" p LEFT JOIN "inventoryDevice" d ON d."productId"=p.id ${where} GROUP BY p.id ORDER BY p.id DESC LIMIT 300`,values);return r.rows;}
export async function findProductById(id:number){const r=await query<ProductRow>(`SELECT p.*, COUNT(d.id) FILTER (WHERE d.status='IN_STOCK')::int AS "deviceStock" FROM "product" p LEFT JOIN "inventoryDevice" d ON d."productId"=p.id WHERE p.id=$1 GROUP BY p.id`,[id]);return r.rows[0]??null;}
export async function createProduct(input:ProductInput){const sku=input.sku?.trim()||`URN-${Date.now().toString().slice(-8)}`;const r=await query<ProductRow>(`INSERT INTO "product" ("sku","name","brand","category","unit","salePrice","vatRate","criticalStock","isSerialized","stockQuantity","status") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[sku,input.name.trim(),input.brand??null,input.category??null,input.unit??"ADET",input.salePrice??null,input.vatRate??20,input.criticalStock??0,input.isSerialized??false,input.stockQuantity??0,input.status??"ACTIVE"]);return r.rows[0];}
export async function findDevices(productId?:number,customerId?:number){const vals:unknown[]=[];const w:string[]=[];if(productId){vals.push(productId);w.push(`d."productId"=$${vals.length}`)}if(customerId){vals.push(customerId);w.push(`d."customerId"=$${vals.length}`)}const r=await query<any>(`SELECT d.*,p."name" AS "productName",p."sku",c."name" AS "customerName",o."orderNo" FROM "inventoryDevice" d JOIN "product" p ON p.id=d."productId" LEFT JOIN "customer" c ON c.id=d."customerId" LEFT JOIN "salesOrder" o ON o.id=d."salesOrderId" ${w.length?`WHERE ${w.join(" AND ")}`:""} ORDER BY d.id DESC LIMIT 500`,vals);return r.rows;}
export async function findDeviceById(id:number){const r=await query<any>(`SELECT d.*,p."name" AS "productName",p."sku",c."name" AS "customerName",o."orderNo" FROM "inventoryDevice" d JOIN "product" p ON p.id=d."productId" LEFT JOIN "customer" c ON c.id=d."customerId" LEFT JOIN "salesOrder" o ON o.id=d."salesOrderId" WHERE d.id=$1`,[id]);return r.rows[0]??null;}


export async function createDevice(
  productId: number,
  serialNumber: string,
  userId: number
) {
  // Ürün ID kontrolü
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    throw new Error("Geçerli bir ürün ID girilmelidir.");
  }

  // Seri numarası kontrolü
  const cleanSerialNumber = serialNumber?.trim();

  if (!cleanSerialNumber) {
    throw new Error("Seri numarası zorunludur.");
  }

  // Veritabanı bağlantısını al
  const client = await pool.connect();

  try {
    // Transaction başlat
    await client.query("BEGIN");

    // Ürünü kontrol et ve işlem boyunca kilitle
    const productResult = await client.query<{
      id: number;
      name: string;
      isSerialized: boolean;
      status: string;
    }>(
      `
      SELECT
        id,
        name,
        "isSerialized",
        status
      FROM "product"
      WHERE id = $1
      FOR UPDATE
      `,
      [productId]
    );

    const product = productResult.rows[0];

    // Ürün mevcut mu?
    if (!product) {
      throw new Error("Ürün bulunamadı.");
    }

    // Ürün aktif mi?
    if (product.status !== "ACTIVE") {
      throw new Error("Pasif ürünler için cihaz girişi yapılamaz.");
    }

    // Seri numaralı ürün kontrolü
    if (!product.isSerialized) {
      throw new Error(
        "Bu ürün seri numaralı olarak tanımlanmamış. Cihaz girişi yapılamaz."
      );
    }

    // Aynı seri numarası daha önce kaydedilmiş mi?
    const existingDevice = await client.query(
      `
      SELECT id
      FROM "inventoryDevice"
      WHERE "serialNumber" = $1
      `,
      [cleanSerialNumber]
    );

    if (existingDevice.rows.length > 0) {
      throw new Error(
        "Bu seri numarasına sahip bir cihaz zaten kayıtlı."
      );
    }

    // Cihaz kaydını oluştur
    const deviceResult = await client.query(
      `
      INSERT INTO "inventoryDevice"
        ("productId", "serialNumber")
      VALUES ($1, $2)
      RETURNING *
      `,
      [productId, cleanSerialNumber]
    );

    const device = deviceResult.rows[0];

    
    // Stok hareketini kullanıcı bilgisiyle oluştur
    await client.query(
      `
      INSERT INTO "stockMovement"
        (
          "productId",
          "deviceId",
          "type",
          "quantity",
          "notes",
          "createdBy"
        )
      VALUES ($1, $2, 'IN', 1, $3, $4)
      `,
      [
        productId,
        device.id,
        "Seri numaralı cihaz girişi",
        userId
      ]
    );

    // Her iki işlem de başarılıysa kaydet
    await client.query("COMMIT");

    return device;

  } catch (error) {

    // Hata oluşursa bütün işlemleri geri al
    await client.query("ROLLBACK");

    throw error;

  } finally {

    // Bağlantıyı havuza geri bırak
    client.release();

  }
}

export async function findStockMovements(
  productId?: number,
  deviceId?: number
) {
  const vals: unknown[] = [];
  const w: string[] = [];

  if (productId) {
    vals.push(productId);
    w.push(`m."productId"=$${vals.length}`);
  }

  if (deviceId) {
    vals.push(deviceId);
    w.push(`m."deviceId"=$${vals.length}`);
  }

  const r = await query<any>(
    `
    SELECT
      m.*,

      p."name" AS "productName",
      p."sku",

      d."serialNumber",

      u."username" AS "createdByUsername",

      CASE
        WHEN u.id IS NOT NULL THEN
          CONCAT_WS(
            ' ',
            u."firstName",
            u."lastName"
          )
        ELSE NULL
      END AS "createdByName"

    FROM "stockMovement" m

    JOIN "product" p
      ON p.id = m."productId"

    LEFT JOIN "inventoryDevice" d
      ON d.id = m."deviceId"

    LEFT JOIN "user" u
      ON u.id = m."createdBy"

    ${w.length ? `WHERE ${w.join(" AND ")}` : ""}

    ORDER BY
      m."createdAt" DESC,
      m.id DESC

    LIMIT 1000
    `,
    vals
  );

  return r.rows;
}