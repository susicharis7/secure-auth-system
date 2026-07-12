import app from "./app";
import dns from "dns";
import { config } from "./config/env";
import { connectDatabase } from "./config/database";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

async function bootstrap() {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
