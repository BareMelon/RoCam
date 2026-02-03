import { FastifyInstance, FastifyRequest } from "fastify";
import { getGameByApiKey } from "../services/gameService.js";

const extractApiKey = (request: FastifyRequest) => {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const headerKey = request.headers["x-api-key"];
  if (typeof headerKey === "string" && headerKey.trim().length > 0) {
    return headerKey.trim();
  }

  return null;
};

export const registerGameAuth = async (app: FastifyInstance) => {
  app.decorate("requireGameAuth", async (request: FastifyRequest, reply) => {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return reply.status(401).send({
        error: "missing_api_key"
      });
    }

    try {
      const game = await getGameByApiKey(apiKey);
      if (!game) {
        return reply.status(401).send({
          error: "invalid_api_key"
        });
      }

      request.game = game;
      return undefined;
    } catch (error) {
      request.log.error({ error }, "Failed to validate API key");
      return reply.status(500).send({
        error: "auth_error"
      });
    }
  });
};
