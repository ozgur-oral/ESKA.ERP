
import { recordAudit } from "../services/audit.service.js";
import type { Request, Response } from "express";
import * as svc from "../services/document.service.js";
import { ok } from "../utils/http.js";

const num = (value: unknown) =>
  value == null || value === ""
    ? undefined
    : Number(value);

// BELGE ÖZETİ

export async function documentSummary(
  _req: Request,
  res: Response
) {
  return ok(res, await svc.getDocumentSummary());
}

// BELGE KATEGORİLERİ

export async function documentCategories(
  _req: Request,
  res: Response
) {
  return ok(res, await svc.categories());
}

// BELGE LİSTESİ

export async function documentsIndex(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.listDocuments({
      q:
        typeof req.query.q === "string"
          ? req.query.q
          : undefined,

      category:
        typeof req.query.category === "string"
          ? req.query.category
          : undefined,

      status:
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,

      userId: req.auth?.userId,
      role: req.auth?.role,

      entityType:
        typeof req.query.entityType === "string"
          ? req.query.entityType
          : undefined,

      entityId: num(req.query.entityId),
    })
  );
}

// BELGE DETAYI

export async function documentShow(
  req: Request,
  res: Response
) {
  const documentId = Number(req.params.id);

  if (
    !(await svc.canAccessDocument(
      documentId,
      req.auth?.userId,
      req.auth?.role,
      false
    ))
  ) {
    return res.status(403).json({
      success: false,
      message: "Bu dokümana erişim yetkiniz bulunmuyor.",
    });
  }

  const document = await svc.getDocument(documentId);

  return document
    ? ok(res, document)
    : res.status(404).json({
        success: false,
        message: "Doküman bulunamadı.",
      });
}

// BELGE OLUŞTURMA

export async function documentCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.title?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Doküman başlığı zorunludur.",
    });
  }

  const document = await svc.createDocument(
    req.body,
    req.auth?.userId
  );

  if (req.body.entityType && req.body.entityId) {
    await svc.addDocumentLink(
      document.id,
      {
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        label: req.body.linkLabel,
      },
      req.auth?.userId
    );
  }

  const data = await svc.getDocument(document.id);

  await recordAudit({
    action: "CREATE",
    module: "DOCUMENT",
    entityType: "document",
    entityId: document.id,
    entityLabel: document.title,
    newValues: data,
  });

  return res.status(201).json({
    success: true,
    data,
    message: "Doküman oluşturuldu.",
  });
}

// BELGE BAĞLANTISI OLUŞTURMA

export async function documentLinkCreate(
  req: Request,
  res: Response
) {
  const documentId = Number(req.params.id);

  if (
    !(await svc.canAccessDocument(
      documentId,
      req.auth?.userId,
      req.auth?.role,
      true
    ))
  ) {
    return res.status(403).json({
      success: false,
      message: "Bu dokümanı düzenleme yetkiniz bulunmuyor.",
    });
  }

  if (!req.body?.entityType || !req.body?.entityId) {
    return res.status(400).json({
      success: false,
      message: "Bağlantı tipi ve kayıt zorunludur.",
    });
  }

  const data = await svc.addDocumentLink(
    documentId,
    req.body,
    req.auth?.userId
  );

  return res.status(201).json({
    success: true,
    data,
  });
}

// BELGE BAĞLANTISI SİLME

export async function documentLinkDelete(
  req: Request,
  res: Response
) {
  const documentId = Number(req.params.id);
  const linkId = Number(req.params.linkId);

  if (
    !(await svc.canAccessDocument(
      documentId,
      req.auth?.userId,
      req.auth?.role,
      true
    ))
  ) {
    return res.status(403).json({
      success: false,
      message: "Bu dokümanı düzenleme yetkiniz bulunmuyor.",
    });
  }

  const data = await svc.removeDocumentLink(
    documentId,
    linkId,
    req.auth?.userId
  );

  return data
    ? ok(res, data)
    : res.status(404).json({
        success: false,
        message: "Bağlantı bulunamadı.",
      });
}

// BELGE DURUMU GÜNCELLEME

export async function documentStatus(
  req: Request,
  res: Response
) {
  const documentId = Number(req.params.id);

  if (
    !(await svc.canAccessDocument(
      documentId,
      req.auth?.userId,
      req.auth?.role,
      true
    ))
  ) {
    return res.status(403).json({
      success: false,
      message: "Bu dokümanı düzenleme yetkiniz bulunmuyor.",
    });
  }

  const status = String(req.body?.status || "");

  if (
    !["ACTIVE", "ARCHIVED", "CANCELLED"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz durum.",
    });
  }

  return ok(
    res,
    await svc.setDocumentStatus(
      documentId,
      status,
      req.auth?.userId
    )
  );
}

// BELGE ERİŞİM YETKİLERİ

export async function documentAccess(
  req: Request,
  res: Response
) {
  const documentId = Number(req.params.id);

  if (
    !(await svc.canAccessDocument(
      documentId,
      req.auth?.userId,
      req.auth?.role,
      true
    ))
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Bu dokümanın erişim ayarlarını değiştirme yetkiniz bulunmuyor.",
    });
  }

  return ok(
    res,
    await svc.saveDocumentAccess(
      documentId,
      req.body,
      req.auth?.userId
    )
  );
}

// BELGE SÜRÜMÜ YÜKLEME

export async function documentUpload(
  req: Request,
  res: Response
) {
  try {
    const documentId = Number(req.params.id);

    if (
      !Number.isSafeInteger(documentId) ||
      documentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz doküman numarası.",
      });
    }

    const canAccess = await svc.canAccessDocument(
      documentId,
      req.auth?.userId,
      req.auth?.role,
      true
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message:
          "Bu dokümana sürüm yükleme yetkiniz bulunmuyor.",
      });
    }

    const fileName = String(
      req.headers["x-file-name"] || "document.bin"
    );

    const mime = String(
      req.headers["content-type"] ||
        "application/octet-stream"
    );

    const changeNote =
      typeof req.headers["x-change-note"] === "string"
        ? req.headers["x-change-note"]
        : undefined;

    const data = await svc.uploadVersion(
      documentId,
      fileName,
      mime,
      req.body as Buffer,
      changeNote,
      req.auth?.userId
    );

    await recordAudit({
      action: "VERSION_UPLOAD",
      module: "DOCUMENT",
      entityType: "document",
      entityId: documentId,
      entityLabel: fileName,
      newValues: data,
    });

    return res.status(201).json({
      success: true,
      data,
      message: "Yeni doküman sürümü yüklendi.",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message || "Dosya yüklenemedi.",
    });
  }
}

// BELGE İNDİRME

export async function documentDownload(
  req: Request,
  res: Response
) {
  try {
    const { version, data } =
      await svc.downloadVersion(
        Number(req.params.versionId),
        req.auth?.userId,
        req.auth?.role
      );

    res.setHeader(
      "Content-Type",
      version.mimeType ||
        "application/octet-stream"
    );

    res.setHeader(
      "Content-Length",
      String(data.length)
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(
        version.fileName
      )}`
    );

    return res.send(data);
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message:
        error?.message || "Dosya bulunamadı.",
    });
  }
}