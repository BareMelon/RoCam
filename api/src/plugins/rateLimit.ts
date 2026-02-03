import { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";

type RateBucket = {
  count: number;
  resetAt: number;
  limit: number;
};

const buckets = new Map<string, RateBucket>();

const getRateLimitKey = (request: FastifyRequest) => {
  const gameId = request.game?.id ?? "unknown";
  const identity = request.body && typeof request.body === "object"
    ? (request.body as { identity?: { userId?: string } }).identity?.userId
    : undefined;
  return `${gameId}:${identity ?? "anonymous"}`;
};

const resolveLimitConfig = (request: FastifyRequest) => {
  const settings = request.game?.settings?.rateLimit;
  return {
    windowMs: settings?.windowMs ?? config.rateLimitWindowMs,
    max: settings?.max ?? config.rateLimitMax
  };
};

export const registerRateLimit = async (app: FastifyInstance) => {
  app.decorate("enforceRateLimit", async (request: FastifyRequest, reply) => {
    const key = getRateLimitKey(request);
    const { windowMs, max } = resolveLimitConfig(request);
    const now = Date.now();

    const existing = buckets.get(key);
    if (!existing || now >= existing.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
        limit: max
      });
      reply.header("X-RateLimit-Limit", max);
      reply.header("X-RateLimit-Remaining", Math.max(0, max - 1));
      reply.header("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));
      return undefined;
    }

    if (existing.count >= existing.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      reply.header("Retry-After", retryAfterSeconds);
      reply.header("X-RateLimit-Limit", existing.limit);
      reply.header("X-RateLimit-Remaining", 0);
      reply.header("X-RateLimit-Reset", Math.ceil(existing.resetAt / 1000));
      return reply.status(429).send({
        error: "rate_limited",
        retryAfterSeconds
      });
    }

    existing.count += 1;
    buckets.set(key, existing);
    reply.header("X-RateLimit-Limit", existing.limit);
    reply.header("X-RateLimit-Remaining", Math.max(0, existing.limit - existing.count));
    reply.header("X-RateLimit-Reset", Math.ceil(existing.resetAt / 1000));
    return undefined;
  });
};
