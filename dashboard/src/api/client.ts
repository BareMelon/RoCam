const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const DASHBOARD_TOKEN = import.meta.env.VITE_DASHBOARD_TOKEN ?? "";

type ApiRequest = {
  path: string;
  options?: RequestInit;
};

function getHeaders(init?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init as Record<string, string>)
  };
  if (DASHBOARD_TOKEN) {
    headers.Authorization = `Bearer ${DASHBOARD_TOKEN}`;
  }
  return headers;
}

export const apiFetch = async <T>({ path, options }: ApiRequest): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: getHeaders(options?.headers)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`API error: ${response.status} ${JSON.stringify(errorBody)}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
};

export type Game = {
  id: string;
  name: string;
  settings?: Record<string, unknown>;
  stats?: { openCount: number; bugPct: number; reports7d: number };
};
export type FeedbackItem = {
  id: string;
  gameId: string;
  type: string;
  status: string;
  body: string;
  developerNotes: string | null;
  createdAt: string;
  [key: string]: unknown;
};

export const getGames = (opts?: { stats?: boolean }) => {
  const path = opts?.stats ? "/v1/games?stats=1" : "/v1/games";
  return apiFetch<{ games: Game[] }>({ path });
};

export const createGameApi = (name: string, betaAccessKey?: string) =>
  apiFetch<{ game: Game; apiKey: string }>({
    path: "/v1/games",
    options: {
      method: "POST",
      body: JSON.stringify(betaAccessKey ? { name, betaAccessKey } : { name })
    }
  });

export const getFeedback = (
  gameId: string,
  params?: { status?: string; type?: string; limit?: number | string }
) => {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.type) search.set("type", params.type);
  if (params?.limit != null) search.set("limit", String(params.limit));
  const q = search.toString();
  return apiFetch<{ feedback: FeedbackItem[] }>({
    path: `/v1/games/${gameId}/feedback${q ? `?${q}` : ""}`
  });
};

export const updateFeedbackApi = (
  gameId: string,
  feedbackId: string,
  payload: { status?: string; developerNotes?: string | null }
) =>
  apiFetch<FeedbackItem>({
    path: `/v1/games/${gameId}/feedback/${feedbackId}`,
    options: { method: "PATCH", body: JSON.stringify(payload) }
  });

export type Analytics = {
  total: number;
  openCount: number;
  resolvedCount: number;
  bugPct: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  last7Days: { date: string; count: number }[];
};

export const getAnalytics = (gameId: string) =>
  apiFetch<Analytics>({ path: `/v1/games/${gameId}/analytics` });

export const deleteFeedbackApi = (gameId: string, feedbackId: string) =>
  apiFetch<void>({
    path: `/v1/games/${gameId}/feedback/${feedbackId}`,
    options: { method: "DELETE" }
  });

export const deleteFeedbackBulkApi = (gameId: string, ids: string[]) =>
  apiFetch<{ deleted: number }>({
    path: `/v1/games/${gameId}/feedback/bulk-delete`,
    options: { method: "POST", body: JSON.stringify({ ids }) }
  });
