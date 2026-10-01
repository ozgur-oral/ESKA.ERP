import "dotenv/config";
import { query } from "./db/pool.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

async function start() {
  try {
    await query("SELECT 1");
    console.log("PostgreSQL bağlantısı başarılı.");
  } catch (error) {
    console.error(
      "PostgreSQL bağlantısı kurulamadı; API güvenli biçimde başlatılmadı.",
      error
    );
    process.exitCode = 1;
    return;
  }

  app.listen(port, () => {
    console.log(`ESKA.ERP API http://localhost:${port} adresinde çalışıyor.`);
  });
}

void start();