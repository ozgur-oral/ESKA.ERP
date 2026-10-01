import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { auditRequestContext } from "./middleware/audit-context.js";
import { rateLimit, securityHeaders } from "./middleware/security.js";

export function createApp() {
  const app = express();
  const allowedOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

  app.disable("x-powered-by");
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));
  app.use(securityHeaders);
  app.use(rateLimit({windowMs:60_000,max:Number(process.env.API_RATE_LIMIT_PER_MINUTE??300)}));
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(auditRequestContext);
  app.use("/api", apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
