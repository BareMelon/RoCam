import { FastifyInstance } from "fastify";
import { checkDbReady, isDbConfigured } from "../db/index.js";

export const registerHealthRoutes = async (app: FastifyInstance) => {
  app.get("/health", async () => ({
    status: "ok"
  }));

  app.get("/ready", async (_request, reply) => {
    if (!isDbConfigured()) {
      return reply.status(503).send({
        status: "not_ready",
        reason: "DATABASE_URL not configured"
      });
    }

    const dbReady = await checkDbReady();
    if (!dbReady) {
      return reply.status(503).send({
        status: "not_ready",
        reason: "Database connection failed"
      });
    }

    return {
      status: "ready"
    };
  });
};
