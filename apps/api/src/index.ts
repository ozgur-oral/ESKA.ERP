import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "@eska/database";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "ESKA.ERP API çalışıyor",
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const modules = await db.orm.public.Module.all();

    res.json({
      success: true,
      message: "ESKA.ERP API ve PostgreSQL bağlantısı çalışıyor",
      moduleCount: modules.length,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "PostgreSQL bağlantısı başarısız",
    });
  }
});

async function startServer() {
  try {
    await db.connect();

    console.log("PostgreSQL bağlantısı başarılı");

    app.listen(PORT, () => {
      console.log(
        `ESKA.ERP API http://localhost:${PORT} adresinde çalışıyor`
      );
    });
  } catch (error) {
    console.error("PostgreSQL bağlantısı kurulamadı:", error);
    process.exit(1);
  }
}

startServer();