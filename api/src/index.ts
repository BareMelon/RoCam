import "dotenv/config";
import { buildApp } from "./app.js";
import { config } from "./config.js";

const start = async () => {
  const app = await buildApp();
  try {
    await app.listen({
      host: config.host,
      port: config.port
    });
  } catch (error) {
    app.log.error(error, "Failed to start server");
    process.exit(1);
  }
};

start();
