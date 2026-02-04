import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { registerGameAuth } from "./plugins/gameAuth.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { registerDashboardAuth } from "./plugins/dashboardAuth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerFeedbackRoutes } from "./routes/feedback.js";
import { registerGamesRoutes } from "./routes/games.js";

export const buildApp = async () => {
  const app = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024
  });

  await app.register(helmet);

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (!config.dashboardOrigin) {
        callback(null, true);
        return;
      }
      const allowed = config.dashboardOrigin.split(",").map((entry) => entry.trim());
      if (allowed.includes("*")) {
        callback(null, true);
        return;
      }
      callback(null, allowed.includes(origin));
    }
  });

  await registerGameAuth(app);
  await registerRateLimit(app);
  await registerDashboardAuth(app);
  await registerHealthRoutes(app);
  await registerFeedbackRoutes(app);
  await registerGamesRoutes(app);

  return app;
};
