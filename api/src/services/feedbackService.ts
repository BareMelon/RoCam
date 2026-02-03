import { randomUUID } from "node:crypto";
import { FeedbackCreateInput, FeedbackRecord } from "@feedback/shared";
import { config } from "../config.js";
import { query } from "../db/index.js";

const inMemoryStore = new Map<string, FeedbackRecord[]>();

export const createFeedback = async (
  gameId: string,
  payload: FeedbackCreateInput
): Promise<FeedbackRecord> => {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const record: FeedbackRecord = {
    id,
    gameId,
    type: payload.type,
    identityOption: payload.identityOption,
    status: "new",
    body: payload.body,
    category: payload.category ?? null,
    tags: payload.tags ?? [],
    severity: payload.severity ?? null,
    identity: payload.identity ?? null,
    metadata: payload.metadata ?? null,
    developerNotes: null,
    createdAt
  };

  if (!config.databaseUrl) {
    const existing = inMemoryStore.get(gameId) ?? [];
    existing.unshift(record);
    inMemoryStore.set(gameId, existing);
    return record;
  }

  const result = await query<FeedbackRecord>(
    `INSERT INTO feedback (
      id,
      game_id,
      type,
      identity_option,
      status,
      body,
      category,
      tags,
      severity,
      identity,
      metadata,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10::jsonb, $11::jsonb, $12
    )
    RETURNING
      id,
      game_id as "gameId",
      type,
      identity_option as "identityOption",
      status,
      body,
      category,
      tags,
      severity,
      identity,
      metadata,
      created_at as "createdAt"`,
    [
      record.id,
      record.gameId,
      record.type,
      record.identityOption,
      record.status,
      record.body,
      record.category,
      record.tags,
      record.severity,
      record.identity,
      record.metadata,
      record.createdAt
    ]
  );

  const row = result.rows[0] as Omit<FeedbackRecord, "developerNotes"> & { developerNotes?: string | null };
  return { ...row, developerNotes: row?.developerNotes ?? null } as FeedbackRecord;
};

export type ListFeedbackOptions = {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
};

export const listFeedbackByGameId = async (
  gameId: string,
  options: ListFeedbackOptions = {}
): Promise<FeedbackRecord[]> => {
  const { limit = 50, offset = 0 } = options;

  if (!config.databaseUrl) {
    const list = inMemoryStore.get(gameId) ?? [];
    let out = [...list];
    if (options.status) out = out.filter((f) => f.status === options.status);
    if (options.type) out = out.filter((f) => f.type === options.type);
    return out.slice(offset, offset + limit);
  }

  const params: unknown[] = [gameId];
  const conditions: string[] = ["game_id = $1"];
  let nextParam = 2;
  if (options.status) {
    conditions.push(`status = $${nextParam}`);
    params.push(options.status);
    nextParam++;
  }
  if (options.type) {
    conditions.push(`type = $${nextParam}`);
    params.push(options.type);
    nextParam++;
  }
  params.push(limit, offset);
  const result = await query<FeedbackRecord & { developerNotes?: string | null }>(
    `SELECT id, game_id as "gameId", type, identity_option as "identityOption", status, body,
      category, tags, severity, identity, metadata, developer_notes as "developerNotes", created_at as "createdAt"
     FROM feedback
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${nextParam} OFFSET $${nextParam + 1}`,
    params
  );
  return result.rows.map((r) => ({ ...r, developerNotes: r.developerNotes ?? null } as FeedbackRecord));
};

export const updateFeedback = async (
  feedbackId: string,
  gameId: string,
  payload: { status?: FeedbackRecord["status"]; developerNotes?: string | null }
): Promise<FeedbackRecord | null> => {
  if (!config.databaseUrl) {
    const list = inMemoryStore.get(gameId) ?? [];
    const idx = list.findIndex((f) => f.id === feedbackId);
    if (idx === -1) return null;
    if (payload.status != null) list[idx].status = payload.status;
    if (payload.developerNotes !== undefined) list[idx].developerNotes = payload.developerNotes;
    return list[idx];
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (payload.status != null) {
    updates.push(`status = $${i}`);
    params.push(payload.status);
    i++;
  }
  if (payload.developerNotes !== undefined) {
    updates.push(`developer_notes = $${i}`);
    params.push(payload.developerNotes);
    i++;
  }
  if (updates.length === 0) {
    const one = await query<FeedbackRecord & { developerNotes?: string | null }>(
      `SELECT id, game_id as "gameId", type, identity_option as "identityOption", status, body,
        category, tags, severity, identity, metadata, developer_notes as "developerNotes", created_at as "createdAt"
       FROM feedback WHERE id = $1 AND game_id = $2`,
      [feedbackId, gameId]
    );
    const r = one.rows[0];
    return r ? { ...r, developerNotes: r.developerNotes ?? null } as FeedbackRecord : null;
  }
  params.push(feedbackId, gameId);
  const result = await query<FeedbackRecord & { developerNotes?: string | null }>(
    `UPDATE feedback SET ${updates.join(", ")} WHERE id = $${i} AND game_id = $${i + 1}
     RETURNING id, game_id as "gameId", type, identity_option as "identityOption", status, body,
       category, tags, severity, identity, metadata, developer_notes as "developerNotes", created_at as "createdAt"`,
    params
  );
  const r = result.rows[0];
  return r ? { ...r, developerNotes: r.developerNotes ?? null } as FeedbackRecord : null;
};

export type FeedbackStats = {
  total: number;
  openCount: number;
  resolvedCount: number;
  bugPct: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  last7Days: { date: string; count: number }[];
};

export const getFeedbackStats = async (gameId: string): Promise<FeedbackStats> => {
  if (!config.databaseUrl) {
    const list = inMemoryStore.get(gameId) ?? [];
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const f of list) {
      byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
      byType[f.type] = (byType[f.type] ?? 0) + 1;
    }
    const openCount = list.filter((f) => f.status !== "resolved" && f.status !== "ignored").length;
    const resolvedCount = list.filter((f) => f.status === "resolved").length;
    const bugCount = list.filter((f) => f.type === "bug_report").length;
    const bugPct = list.length ? Math.round((bugCount / list.length) * 100) : 0;
    const now = new Date();
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = list.filter((f) => f.createdAt.slice(0, 10) === dateStr).length;
      last7Days.push({ date: dateStr, count });
    }
    return {
      total: list.length,
      openCount,
      resolvedCount,
      bugPct,
      byStatus,
      byType,
      last7Days
    };
  }

  const [totals, statusRows, typeRows, dailyRows] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*) as total FROM feedback WHERE game_id = $1`, [gameId]),
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text as count FROM feedback WHERE game_id = $1 GROUP BY status`,
      [gameId]
    ),
    query<{ type: string; count: string }>(
      `SELECT type, COUNT(*)::text as count FROM feedback WHERE game_id = $1 GROUP BY type`,
      [gameId]
    ),
    query<{ date: string; count: string }>(
      `SELECT created_at::date::text as date, COUNT(*)::text as count FROM feedback
       WHERE game_id = $1 AND created_at >= (CURRENT_DATE - INTERVAL '6 days')
       GROUP BY created_at::date ORDER BY date`,
      [gameId]
    )
  ]);

  const total = Number(totals.rows[0]?.total ?? 0);
  const byStatus: Record<string, number> = {};
  statusRows.rows.forEach((r) => { byStatus[r.status] = Number(r.count); });
  const byType: Record<string, number> = {};
  typeRows.rows.forEach((r) => { byType[r.type] = Number(r.count); });

  const openCount = (byStatus["new"] ?? 0) + (byStatus["triaged"] ?? 0);
  const resolvedCount = byStatus["resolved"] ?? 0;
  const bugCount = byType["bug_report"] ?? 0;
  const bugPct = total ? Math.round((bugCount / total) * 100) : 0;

  const dayMap = new Map<string, number>();
  dailyRows.rows.forEach((r) => dayMap.set(r.date, Number(r.count)));
  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    last7Days.push({ date: dateStr, count: dayMap.get(dateStr) ?? 0 });
  }

  return { total, openCount, resolvedCount, bugPct, byStatus, byType, last7Days };
};

export const deleteFeedback = async (feedbackId: string, gameId: string): Promise<boolean> => {
  if (!config.databaseUrl) {
    const list = inMemoryStore.get(gameId) ?? [];
    const idx = list.findIndex((f) => f.id === feedbackId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    inMemoryStore.set(gameId, list);
    return true;
  }
  const result = await query(`DELETE FROM feedback WHERE id = $1 AND game_id = $2`, [feedbackId, gameId]);
  return (result.rowCount ?? 0) > 0;
};

export const deleteFeedbackBulk = async (gameId: string, ids: string[]): Promise<{ deleted: number }> => {
  if (ids.length === 0) return { deleted: 0 };
  if (!config.databaseUrl) {
    const list = inMemoryStore.get(gameId) ?? [];
    const idSet = new Set(ids);
    const kept = list.filter((f) => !idSet.has(f.id));
    const deleted = list.length - kept.length;
    inMemoryStore.set(gameId, kept);
    return { deleted };
  }
  const result = await query(
    `DELETE FROM feedback WHERE game_id = $1 AND id = ANY($2::uuid[])`,
    [gameId, ids]
  );
  return { deleted: result.rowCount ?? 0 };
};
