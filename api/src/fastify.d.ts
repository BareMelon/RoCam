import "fastify";
import { FastifyReply, FastifyRequest } from "fastify";
import { GameRecord } from "./services/gameService.js";

declare module "fastify" {
  interface FastifyInstance {
    requireGameAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void | unknown>;
    enforceRateLimit: (request: FastifyRequest, reply: FastifyReply) => Promise<void | unknown>;
  }

  interface FastifyRequest {
    game?: GameRecord;
    dashboardAccountId?: string;
  }

  interface FastifyInstance {
    requireDashboardAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void | unknown>;
  }
}
