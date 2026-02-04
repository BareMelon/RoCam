import { FastifyInstance } from "fastify";
import { listGamesByAccountId, createGame, getGameByIdAndAccount } from "../services/gameService.js";
import {
  listFeedbackByGameId,
  updateFeedback,
  getFeedbackStats,
  deleteFeedback,
  deleteFeedbackBulk
} from "../services/feedbackService.js";
import { validateBetaKey, consumeBetaKey } from "../services/betaAccessService.js";
import { submitStat, getOverviewStats, type StatType, type Period } from "../services/statsService.js";
import { config } from "../config.js";

export const registerGamesRoutes = async (app: FastifyInstance) => {
  app.get(
    "/v1/games",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      if (!accountId) {
        return reply.status(401).send({ error: "unauthorized" });
      }
      const games = await listGamesByAccountId(accountId);
      const withStats = (request.query as { stats?: string }).stats === "1";
      if (!withStats) {
        return { games };
      }
      const gamesWithStats = await Promise.all(
        games.map(async (g) => {
          const stats = await getFeedbackStats(g.id);
          const reports7d = stats.last7Days.reduce((sum, d) => sum + d.count, 0);
          return {
            ...g,
            stats: {
              openCount: stats.openCount,
              bugPct: stats.bugPct,
              reports7d
            }
          };
        })
      );
      return { games: gamesWithStats };
    }
  );

  app.post(
    "/v1/games",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      if (!accountId) {
        return reply.status(401).send({ error: "unauthorized" });
      }
      const body = request.body as { name?: string; betaAccessKey?: string };
      const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : null;
      if (!name) {
        return reply.status(400).send({ error: "name_required" });
      }
      if (config.betaAccessRequired) {
        const rawKey = typeof body?.betaAccessKey === "string" ? body.betaAccessKey.trim() : "";
        const keyId = await validateBetaKey(rawKey);
        if (!keyId) {
          return reply.status(403).send({
            error: "beta_access_required",
            message: "A valid beta access key is required to add an experience."
          });
        }
        const consumed = await consumeBetaKey(keyId);
        if (!consumed) {
          return reply.status(403).send({
            error: "beta_access_required",
            message: "This beta key has no remaining uses."
          });
        }
      }
      const { game, apiKey } = await createGame(accountId, name);
      return reply.status(201).send({ game, apiKey });
    }
  );

  app.get(
    "/v1/games/:gameId/feedback",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      const { gameId } = request.params as { gameId: string };
      if (!accountId) {
        return reply.status(401).send({ error: "unauthorized" });
      }
      const game = await getGameByIdAndAccount(gameId, accountId);
      if (!game) {
        return reply.status(404).send({ error: "game_not_found" });
      }
      const status = (request.query as { status?: string }).status;
      const type = (request.query as { type?: string }).type;
      const limit = Math.min(Number((request.query as { limit?: string }).limit) || 50, 100);
      const offset = Number((request.query as { offset?: string }).offset) || 0;
      const feedback = await listFeedbackByGameId(gameId, { status, type, limit, offset });
      return { feedback };
    }
  );

  app.patch(
    "/v1/games/:gameId/feedback/:feedbackId",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      const { gameId, feedbackId } = request.params as { gameId: string; feedbackId: string };
      if (!accountId) {
        return reply.status(401).send({ error: "unauthorized" });
      }
      const game = await getGameByIdAndAccount(gameId, accountId);
      if (!game) {
        return reply.status(404).send({ error: "game_not_found" });
      }
      const body = request.body as { status?: string; developerNotes?: string | null };
      const status = body?.status as "new" | "triaged" | "resolved" | "ignored" | undefined;
      const developerNotes = body?.developerNotes;
      const validStatuses = ["new", "triaged", "resolved", "ignored"];
      if (status != null && !validStatuses.includes(status)) {
        return reply.status(400).send({ error: "invalid_status" });
      }
      const updated = await updateFeedback(feedbackId, gameId, { status, developerNotes });
      if (!updated) {
        return reply.status(404).send({ error: "feedback_not_found" });
      }
      return updated;
    }
  );

  app.get(
    "/v1/games/:gameId/analytics",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      const { gameId } = request.params as { gameId: string };
      if (!accountId) return reply.status(401).send({ error: "unauthorized" });
      const game = await getGameByIdAndAccount(gameId, accountId);
      if (!game) return reply.status(404).send({ error: "game_not_found" });
      const stats = await getFeedbackStats(gameId);
      return stats;
    }
  );

  app.delete(
    "/v1/games/:gameId/feedback/:feedbackId",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      const { gameId, feedbackId } = request.params as { gameId: string; feedbackId: string };
      if (!accountId) return reply.status(401).send({ error: "unauthorized" });
      const game = await getGameByIdAndAccount(gameId, accountId);
      if (!game) return reply.status(404).send({ error: "game_not_found" });
      const ok = await deleteFeedback(feedbackId, gameId);
      if (!ok) return reply.status(404).send({ error: "feedback_not_found" });
      return reply.status(204).send();
    }
  );

  app.post(
    "/v1/games/:gameId/feedback/bulk-delete",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      const { gameId } = request.params as { gameId: string };
      if (!accountId) return reply.status(401).send({ error: "unauthorized" });
      const game = await getGameByIdAndAccount(gameId, accountId);
      if (!game) return reply.status(404).send({ error: "game_not_found" });
      const body = request.body as { ids?: string[] };
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === "string") : [];
      const { deleted } = await deleteFeedbackBulk(gameId, ids);
      return { deleted };
    }
  );

  // Stats endpoints
  app.post(
    "/v1/games/:gameId/stats",
    { preHandler: [app.requireGameAuth] },
    async (request, reply) => {
      const { gameId } = request.params as { gameId: string };
      if (!request.game || request.game.id !== gameId) {
        return reply.status(401).send({ error: "unauthorized" });
      }
      const body = request.body as {
        statType?: string;
        period?: string;
        value?: number;
        metadata?: Record<string, unknown>;
      };
      const statType = body?.statType as StatType | undefined;
      const period = body?.period as Period | undefined;
      const value = typeof body?.value === "number" ? body.value : undefined;
      const metadata = body?.metadata;

      const validTypes: StatType[] = ["ccu", "daily_users", "visits", "avg_play_time", "user_age", "country"];
      const validPeriods: Period[] = ["24h", "7d", "30d"];

      if (!statType || !validTypes.includes(statType)) {
        return reply.status(400).send({ error: "invalid_stat_type", validTypes });
      }
      if (!period || !validPeriods.includes(period)) {
        return reply.status(400).send({ error: "invalid_period", validPeriods });
      }
      if (value === undefined || value < 0) {
        return reply.status(400).send({ error: "invalid_value" });
      }

      await submitStat(gameId, statType, period, value, metadata);
      return reply.status(201).send({ success: true });
    }
  );

  app.get(
    "/v1/games/:gameId/overview",
    { preHandler: [app.requireDashboardAuth] },
    async (request, reply) => {
      const accountId = request.dashboardAccountId;
      const { gameId } = request.params as { gameId: string };
      if (!accountId) return reply.status(401).send({ error: "unauthorized" });
      const game = await getGameByIdAndAccount(gameId, accountId);
      if (!game) return reply.status(404).send({ error: "game_not_found" });
      const period = ((request.query as { period?: string }).period || "7d") as Period;
      const validPeriods: Period[] = ["24h", "7d", "30d"];
      if (!validPeriods.includes(period)) {
        return reply.status(400).send({ error: "invalid_period", validPeriods });
      }
      const stats = await getOverviewStats(gameId, period);
      return stats;
    }
  );
};
