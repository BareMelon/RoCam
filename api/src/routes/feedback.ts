import { FastifyInstance } from "fastify";
import { feedbackCreateInputSchema } from "@feedback/shared";
import { createFeedback } from "../services/feedbackService.js";
import { GameSettings } from "../services/gameService.js";

const validateFeatureToggles = (settings: GameSettings | undefined, payload: Record<string, unknown>) => {
  const features = settings?.features;

  if (payload.category && features?.categories === false) {
    return "categories_disabled";
  }

  if (payload.severity && features?.severity === false) {
    return "severity_disabled";
  }

  if (payload.metadata && typeof payload.metadata === "object") {
    const metadata = payload.metadata as Record<string, unknown>;
    if (metadata.attachments && features?.attachments === false) {
      return "attachments_disabled";
    }
  }

  return null;
};

export const registerFeedbackRoutes = async (app: FastifyInstance) => {
  app.post(
    "/v1/feedback",
    {
      preHandler: [app.requireGameAuth, app.enforceRateLimit]
    },
    async (request, reply) => {
      const parseResult = feedbackCreateInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "validation_error",
          details: parseResult.error.flatten()
        });
      }

      if (!request.game) {
        return reply.status(401).send({
          error: "missing_game_context"
        });
      }

      const featureError = validateFeatureToggles(request.game.settings, parseResult.data);
      if (featureError) {
        return reply.status(400).send({
          error: featureError
        });
      }

      const record = await createFeedback(request.game.id, parseResult.data);
      return reply.status(201).send({
        id: record.id
      });
    }
  );
};
