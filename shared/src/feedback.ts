import { z } from "zod";

export const feedbackTypeSchema = z.enum([
  "bug_report",
  "feature_request",
  "general"
]);

export const feedbackIdentityOptionSchema = z.enum([
  "anonymous",
  "userId",
  "usernameUserId"
]);

export const feedbackSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical"
]);

export const feedbackIdentitySchema = z.object({
  userId: z.string().min(1).optional(),
  username: z.string().min(1).optional()
}).refine(
  (value) => Boolean(value.userId || value.username),
  { message: "Identity must include userId and/or username." }
);

export const feedbackCreateInputSchema = z.object({
  type: feedbackTypeSchema,
  identityOption: feedbackIdentityOptionSchema,
  body: z.string().min(1).max(4000),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  severity: feedbackSeveritySchema.optional(),
  identity: feedbackIdentitySchema.optional(),
  metadata: z.record(z.unknown()).optional()
}).refine(
  (value) => (value.identityOption === "anonymous" ? !value.identity : true),
  { message: "Identity must be omitted when identityOption is anonymous." }
);

export type FeedbackCreateInput = z.infer<typeof feedbackCreateInputSchema>;

export type FeedbackRecord = {
  id: string;
  gameId: string;
  type: z.infer<typeof feedbackTypeSchema>;
  identityOption: z.infer<typeof feedbackIdentityOptionSchema>;
  status: "new" | "triaged" | "resolved" | "ignored";
  body: string;
  category: string | null;
  tags: string[];
  severity: z.infer<typeof feedbackSeveritySchema> | null;
  identity: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  developerNotes: string | null;
  createdAt: string;
};
