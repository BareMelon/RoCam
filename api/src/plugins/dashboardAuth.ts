import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";

const getBearerToken = (request: FastifyRequest) => {
  const auth = request.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
};

export const registerDashboardAuth = async (app: FastifyInstance) => {
  app.decorate("requireDashboardAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = getBearerToken(request);

    if (config.dashboardToken) {
      if (!token || token !== config.dashboardToken) {
        return reply.status(401).send({ error: "missing_or_invalid_dashboard_token" });
      }
      request.dashboardAccountId = config.dashboardAccountId ?? "dev-account";
      return undefined;
    }

    request.dashboardAccountId = "dev-account";
    return undefined;
  });
};
