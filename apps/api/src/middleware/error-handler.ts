
import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  console.error(error);

  if (res.headersSent) {
    return _next(error);
  }

  // Aynı seri numarasının tekrar kaydedilmesi
  if (
    error instanceof Error &&
    error.message ===
      "Bu seri numarasına sahip bir cihaz zaten kayıtlı."
  ) {
    res.status(409).json({
      success: false,
      message:
        "Bu seri numarasına sahip bir cihaz zaten kayıtlı.",
    });
    return;
  }

  // PostgreSQL benzersizlik kısıtlaması
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    res.status(409).json({
      success: false,
      message: "Bu bilgilerle kayıt zaten mevcut.",
    });
    return;
  }

  // Geçersiz ürün ve cihaz girişleri
  const validationMessages = [
    "Geçerli bir ürün ID girilmelidir.",
    "Seri numarası zorunludur.",
    "Ürün bulunamadı.",
    "Pasif ürünler için cihaz girişi yapılamaz.",
    "Bu ürün seri numaralı olarak tanımlanmamış. Cihaz girişi yapılamaz.",
  ];

  if (
    error instanceof Error &&
    validationMessages.includes(error.message)
  ) {
    res.status(
      error.message === "Ürün bulunamadı." ? 404 : 400
    ).json({
      success: false,
      message: error.message,
    });
    return;
  }

  // Beklenmeyen sunucu hataları
  res.status(500).json({
    success: false,
    message: "Beklenmeyen bir sunucu hatası oluştu.",
  });
};