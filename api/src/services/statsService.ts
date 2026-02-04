import { config } from "../config.js";
import { query } from "../db/index.js";

export type StatType = "ccu" | "daily_users" | "visits" | "avg_play_time" | "user_age" | "country";
export type Period = "24h" | "7d" | "30d";

export type StatValue = {
  value: number;
  metadata?: Record<string, unknown>;
};

export type StatSeries = {
  label: string;
  value: number;
};

export type OverviewStats = {
  ccuPeak: number;
  dailyUsersPeak: number;
  visitsPeak: number;
  avgPlayTimeMinutes: number;
  avgAge: number;
  ccuSeries: StatSeries[];
  dailyUsersSeries: StatSeries[];
  visitsSeries: StatSeries[];
  playTimeSeries: StatSeries[];
  ageBuckets: { range: string; value: number }[];
  topCountries: { name: string; pct: number }[];
};

export const submitStat = async (
  gameId: string,
  statType: StatType,
  period: Period,
  value: number,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!config.databaseUrl) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  await query(
    `INSERT INTO game_stats (game_id, stat_type, period, value, metadata, recorded_at, recorded_date)
     VALUES ($1, $2, $3, $4, $5, now(), $6::date)
     ON CONFLICT (game_id, stat_type, period, recorded_date)
     DO UPDATE SET value = $4, metadata = $5, recorded_at = now()`,
    [gameId, statType, period, value, metadata ? JSON.stringify(metadata) : null, today]
  );
};

export const getOverviewStats = async (gameId: string, period: Period): Promise<OverviewStats> => {
  if (!config.databaseUrl) {
    return getDefaultOverview(period);
  }

  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const stats = await query<{
    stat_type: string;
    period: string;
    value: string;
    metadata: string | null;
    recorded_at: string;
  }>(
    `SELECT stat_type, period, value, metadata, recorded_at
     FROM game_stats
     WHERE game_id = $1 AND recorded_at >= $2
     ORDER BY recorded_at DESC`,
    [gameId, cutoffDate.toISOString()]
  );

  const statsByType = new Map<string, Array<{ value: number; metadata?: Record<string, unknown>; date: string }>>();
  for (const row of stats.rows) {
    const type = row.stat_type;
    if (!statsByType.has(type)) {
      statsByType.set(type, []);
    }
    statsByType.get(type)!.push({
      value: Number(row.value),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      date: row.recorded_at.slice(0, 10)
    });
  }

  const ccuData = statsByType.get("ccu") || [];
  const dailyUsersData = statsByType.get("daily_users") || [];
  const visitsData = statsByType.get("visits") || [];
  const playTimeData = statsByType.get("avg_play_time") || [];
  const ageData = statsByType.get("user_age") || [];
  const countryData = statsByType.get("country") || [];

  const ccuPeak = ccuData.length > 0 ? Math.max(...ccuData.map((d) => d.value)) : 0;
  const dailyUsersPeak = dailyUsersData.length > 0 ? Math.max(...dailyUsersData.map((d) => d.value)) : 0;
  const visitsPeak = visitsData.length > 0 ? Math.max(...visitsData.map((d) => d.value)) : 0;
  const avgPlayTimeMinutes =
    playTimeData.length > 0 ? playTimeData.reduce((sum, d) => sum + d.value, 0) / playTimeData.length : 0;
  const avgAge = ageData.length > 0 ? ageData.reduce((sum, d) => sum + d.value, 0) / ageData.length : 0;

  const is24h = period === "24h";
  const chartDays = is24h ? 24 : Math.min(days, 14);

  const ccuSeries: StatSeries[] = [];
  const dailyUsersSeries: StatSeries[] = [];
  const visitsSeries: StatSeries[] = [];
  const playTimeSeries: StatSeries[] = [];

  for (let i = 0; i < chartDays; i++) {
    const label = is24h ? `${i}:00` : `Day ${i + 1}`;
    const date = new Date();
    date.setDate(date.getDate() - (chartDays - 1 - i));
    const dateStr = date.toISOString().slice(0, 10);

    const ccuVal = ccuData.find((d) => d.date === dateStr)?.value || 0;
    const usersVal = dailyUsersData.find((d) => d.date === dateStr)?.value || 0;
    const visitsVal = visitsData.find((d) => d.date === dateStr)?.value || 0;
    const playVal = playTimeData.find((d) => d.date === dateStr)?.value || avgPlayTimeMinutes;

    ccuSeries.push({ label, value: Math.round(ccuVal) });
    dailyUsersSeries.push({ label, value: Math.round(usersVal) });
    visitsSeries.push({ label, value: Math.round(visitsVal) });
    playTimeSeries.push({ label, value: Math.round(playVal) });
  }

  const ageBuckets: { range: string; value: number }[] = [];
  if (ageData.length > 0) {
    const buckets = [
      { range: "Under 13", min: 0, max: 13 },
      { range: "13–17", min: 13, max: 18 },
      { range: "18–24", min: 18, max: 25 },
      { range: "25+", min: 25, max: 200 }
    ];
    for (const bucket of buckets) {
      const count = ageData.filter((d) => d.value >= bucket.min && d.value < bucket.max).length;
      const pct = ageData.length > 0 ? Math.round((count / ageData.length) * 100) : 0;
      ageBuckets.push({ range: bucket.range, value: pct });
    }
  } else {
    ageBuckets.push(
      { range: "Under 13", value: 0 },
      { range: "13–17", value: 0 },
      { range: "18–24", value: 0 },
      { range: "25+", value: 0 }
    );
  }

  const topCountries: { name: string; pct: number }[] = [];
  if (countryData.length > 0) {
    const countryMap = new Map<string, number>();
    for (const d of countryData) {
      if (d.metadata && typeof d.metadata === "object" && "country" in d.metadata) {
        const country = String(d.metadata.country);
        countryMap.set(country, (countryMap.get(country) || 0) + d.value);
      }
    }
    const total = Array.from(countryMap.values()).reduce((sum, v) => sum + v, 0);
    const sorted = Array.from(countryMap.entries())
      .map(([name, count]) => ({ name, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
    const otherPct = 100 - sorted.reduce((sum, c) => sum + c.pct, 0);
    topCountries.push(...sorted);
    if (otherPct > 0) {
      topCountries.push({ name: "Other", pct: otherPct });
    }
  } else {
    topCountries.push(
      { name: "No data", pct: 100 }
    );
  }

  return {
    ccuPeak: Math.round(ccuPeak),
    dailyUsersPeak: Math.round(dailyUsersPeak),
    visitsPeak: Math.round(visitsPeak),
    avgPlayTimeMinutes: Math.round(avgPlayTimeMinutes),
    avgAge: Math.round(avgAge * 10) / 10,
    ccuSeries,
    dailyUsersSeries,
    visitsSeries,
    playTimeSeries,
    ageBuckets,
    topCountries
  };
};

function getDefaultOverview(period: Period): OverviewStats {
  const is24h = period === "24h";
  const is7d = period === "7d";
  const days = is24h ? 24 : is7d ? 7 : 30;
  const ccuPeak = is24h ? 124 : is7d ? 89 : 67;
  const dailyUsersPeak = is24h ? 342 : is7d ? 1280 : 5200;
  const visitsPeak = is24h ? 890 : is7d ? 4100 : 18200;
  const avgPlay = is24h ? 18 : is7d ? 22 : 25;

  const ccuSeries = Array.from({ length: is24h ? 24 : Math.min(days, 14) }, (_, i) => {
    const label = is24h ? `${i}:00` : `Day ${i + 1}`;
    const t = i / (is24h ? 24 : days);
    return { label, value: Math.round(ccuPeak * (0.4 + 0.6 * Math.sin(t * Math.PI))) };
  });

  const dailyUsersSeries = Array.from({ length: is24h ? 12 : days }, (_, i) => {
    const label = is24h ? `${i * 2}h` : `Day ${i + 1}`;
    return { label, value: Math.round(dailyUsersPeak * (0.5 + 0.5 * Math.random())) };
  });

  const visitsSeries = Array.from({ length: is24h ? 24 : Math.min(days, 14) }, (_, i) => {
    const label = is24h ? `${i}:00` : `Day ${i + 1}`;
    return { label, value: Math.round(visitsPeak * (0.3 + (0.7 * i) / (is24h ? 24 : days))) };
  });

  const playTimeSeries = Array.from({ length: is24h ? 12 : 7 }, (_, i) => ({
    label: is24h ? `${i * 2}h` : `Day ${i + 1}`,
    value: avgPlay + Math.round((Math.random() - 0.5) * 6)
  }));

  const ageBuckets = [
    { range: "Under 13", value: 22 },
    { range: "13–17", value: 45 },
    { range: "18–24", value: 20 },
    { range: "25+", value: 13 }
  ];

  const topCountries = [
    { name: "United States", pct: 42 },
    { name: "Brazil", pct: 18 },
    { name: "United Kingdom", pct: 12 },
    { name: "Philippines", pct: 8 },
    { name: "Mexico", pct: 6 },
    { name: "Canada", pct: 5 },
    { name: "Other", pct: 9 }
  ];

  return {
    ccuPeak,
    dailyUsersPeak,
    visitsPeak,
    avgPlayTimeMinutes: avgPlay,
    avgAge: 14.2,
    ccuSeries,
    dailyUsersSeries,
    visitsSeries,
    playTimeSeries,
    ageBuckets,
    topCountries
  };
}
