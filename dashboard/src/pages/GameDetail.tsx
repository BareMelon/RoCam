import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import {
  getFeedback,
  getAnalytics,
  updateFeedbackApi,
  deleteFeedbackApi,
  deleteFeedbackBulkApi,
  type FeedbackItem,
  type Analytics
} from "../api/client";

const TYPE_LABELS: Record<string, string> = {
  bug_report: "Bug report",
  feature_request: "Feature request",
  general: "General"
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  resolved: "Resolved",
  ignored: "Ignored"
};

const TYPE_COLORS = ["#ef4444", "#3b82f6", "#6b7280"];
const STATUS_COLORS = ["#eab308", "#3b82f6", "#22c55e", "#6b7280"];

/** Placeholder overview metrics (Roblox Analytics-style). Replace with real API when available. */
const OVERVIEW_PERIODS = ["24h", "7d", "30d"] as const;
const useOverviewPeriod = () => {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");
  return { period, setPeriod };
};

type OverviewDetailId = "ccu" | "dailyUsers" | "visits" | "playTime" | "age" | "nationality" | null;

const placeholderOverview = (period: string) => {
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
};

export const GameDetailPage = () => {
  const { gameId } = useParams();
  const [pageTab, setPageTab] = useState<"overview" | "feedback">("overview");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [overviewDetail, setOverviewDetail] = useState<OverviewDetailId>(null);
  const { period, setPeriod } = useOverviewPeriod();

  const loadData = async () => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const [feedbackRes, analyticsRes] = await Promise.all([
        getFeedback(gameId, { limit: 200 }),
        getAnalytics(gameId)
      ]);
      setFeedback(feedbackRes.feedback);
      setAnalytics(analyticsRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  const filteredFeedback = useMemo(() => {
    let list = feedback;
    if (categoryTab !== "all") {
      list = list.filter((f) => f.type === categoryTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.body?.toLowerCase().includes(q) ||
          (f.developerNotes && String(f.developerNotes).toLowerCase().includes(q))
      );
    }
    return list;
  }, [feedback, categoryTab, searchQuery]);

  const handleStatusChange = async (feedbackId: string, status: string) => {
    if (!gameId) return;
    try {
      const updated = await updateFeedbackApi(gameId, feedbackId, { status });
      setFeedback((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      if (analytics) setAnalytics(await getAnalytics(gameId));
    } catch {
      loadData();
    }
  };

  const handleNotesBlur = async (feedbackId: string, developerNotes: string | null) => {
    if (!gameId) return;
    try {
      const updated = await updateFeedbackApi(gameId, feedbackId, {
        developerNotes: developerNotes || null
      });
      setFeedback((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } catch {
      loadData();
    }
  };

  const handleDeleteOne = async (feedbackId: string) => {
    if (!gameId || !confirm("Delete this feedback?")) return;
    try {
      await deleteFeedbackApi(gameId, feedbackId);
      setFeedback((prev) => prev.filter((f) => f.id !== feedbackId));
      setSelectedIds((s) => { const n = new Set(s); n.delete(feedbackId); return n; });
      if (analytics) setAnalytics(await getAnalytics(gameId));
    } catch {
      loadData();
    }
  };

  const handleBulkDelete = async () => {
    if (!gameId || selectedIds.size === 0 || !confirm(`Delete ${selectedIds.size} item(s)?`)) return;
    setDeleting(true);
    try {
      const { deleted } = await deleteFeedbackBulkApi(gameId, Array.from(selectedIds));
      setFeedback((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
      if (analytics) setAnalytics(await getAnalytics(gameId));
    } catch {
      loadData();
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFeedback.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFeedback.map((f) => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const pieByType = useMemo(() => {
    if (!analytics?.byType) return [];
    return Object.entries(analytics.byType).map(([name, value]) => ({
      name: TYPE_LABELS[name] ?? name,
      value,
      fill: name === "bug_report" ? TYPE_COLORS[0] : name === "feature_request" ? TYPE_COLORS[1] : TYPE_COLORS[2]
    }));
  }, [analytics]);

  const barByStatus = useMemo(() => {
    if (!analytics?.byStatus) return [];
    const order = ["new", "triaged", "resolved", "ignored"];
    return order
      .filter((k) => (analytics.byStatus[k] ?? 0) > 0)
      .map((k) => ({ name: STATUS_LABELS[k], count: analytics.byStatus[k], fill: STATUS_COLORS[order.indexOf(k)] }));
  }, [analytics]);

  const overviewData = useMemo(() => placeholderOverview(period), [period]);

  const closeOverviewDetail = () => setOverviewDetail(null);

  if (!gameId) return null;

  return (
    <div className="card card--full game-detail">
      <div className="feedback-page-header">
        <h1>Experience</h1>
        <div className="button-row">
          <button type="button" onClick={loadData} disabled={loading} className="btn-secondary">
            Refresh
          </button>
          <Link to={`/games/${gameId}/settings`} className="btn-secondary">
            Settings
          </Link>
        </div>
      </div>

      {/* Page-level tabs: Overview | Feedback & reports */}
      <div className="game-detail-tabs">
        <button
          type="button"
          className={`tab ${pageTab === "overview" ? "tab--active" : ""}`}
          onClick={() => setPageTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={`tab ${pageTab === "feedback" ? "tab--active" : ""}`}
          onClick={() => setPageTab("feedback")}
        >
          Feedback &amp; reports
          {analytics && analytics.openCount > 0 && (
            <span className="tab-badge">{analytics.openCount}</span>
          )}
        </button>
      </div>

      {error && (
        <div className="alert-banner" role="alert">
          <span className="alert-banner-icon" aria-hidden="true">!</span>
          <span>{error}</span>
          <div className="alert-banner-actions">
            <button type="button" onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : pageTab === "overview" ? (
        /* ========== OVERVIEW TAB ========== */
        <div className="overview-panel">
          <div className="overview-period">
            <span className="overview-period-label">Period</span>
            <div className="overview-period-buttons">
              {OVERVIEW_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`tab tab--small ${period === p ? "tab--active" : ""}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === "24h" ? "24 hours" : p === "7d" ? "7 days" : "30 days"}
                </button>
              ))}
            </div>
          </div>

          <div className="overview-widgets">
            {/* Peak CCU – line chart widget */}
            <button
              type="button"
              className="overview-widget"
              onClick={() => setOverviewDetail("ccu")}
              aria-label="View Peak CCU details"
            >
              <div className="overview-widget-header">
                <h3 className="overview-widget-title">Peak CCU</h3>
                <span className="overview-widget-value">{overviewData.ccuPeak}</span>
              </div>
              <div className="overview-widget-chart">
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={overviewData.ccuSeries} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <span className="overview-widget-hint">View details</span>
            </button>

            {/* Daily users – area-style bar widget */}
            <button
              type="button"
              className="overview-widget"
              onClick={() => setOverviewDetail("dailyUsers")}
              aria-label="View Daily users details"
            >
              <div className="overview-widget-header">
                <h3 className="overview-widget-title">Daily users</h3>
                <span className="overview-widget-value">{overviewData.dailyUsersPeak.toLocaleString()}</span>
              </div>
              <div className="overview-widget-chart">
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={overviewData.dailyUsersSeries} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <Bar dataKey="value" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <span className="overview-widget-hint">View details</span>
            </button>

            {/* Visits – line chart widget */}
            <button
              type="button"
              className="overview-widget"
              onClick={() => setOverviewDetail("visits")}
              aria-label="View Visits details"
            >
              <div className="overview-widget-header">
                <h3 className="overview-widget-title">Visits</h3>
                <span className="overview-widget-value">{overviewData.visitsPeak.toLocaleString()}</span>
              </div>
              <div className="overview-widget-chart">
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={overviewData.visitsSeries} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <Line type="monotone" dataKey="value" stroke="var(--success)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <span className="overview-widget-hint">View details</span>
            </button>

            {/* Avg play time – bar widget */}
            <button
              type="button"
              className="overview-widget"
              onClick={() => setOverviewDetail("playTime")}
              aria-label="View Avg play time details"
            >
              <div className="overview-widget-header">
                <h3 className="overview-widget-title">Avg. play time</h3>
                <span className="overview-widget-value">{overviewData.avgPlayTimeMinutes} min</span>
              </div>
              <div className="overview-widget-chart">
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={overviewData.playTimeSeries} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <Bar dataKey="value" fill="var(--accent-alt)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <span className="overview-widget-hint">View details</span>
            </button>

            {/* Avg age – pie/donut style widget */}
            <button
              type="button"
              className="overview-widget"
              onClick={() => setOverviewDetail("age")}
              aria-label="View Age distribution details"
            >
              <div className="overview-widget-header">
                <h3 className="overview-widget-title">User age</h3>
                <span className="overview-widget-value">{overviewData.avgAge}</span>
              </div>
              <div className="overview-widget-chart overview-widget-chart--pie">
                <ResponsiveContainer width="100%" height={80}>
                  <PieChart>
                    <Pie
                      data={overviewData.ageBuckets}
                      dataKey="value"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      innerRadius={22}
                      outerRadius={36}
                      paddingAngle={2}
                      activeShape={false}
                    >
                      {overviewData.ageBuckets.map((_, i) => (
                        <Cell key={i} fill={["#00a76f", "#3b82f6", "#7c3aed", "#e9b308"][i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <span className="overview-widget-hint">View details</span>
            </button>

            {/* Nationality – horizontal bar list widget */}
            <button
              type="button"
              className="overview-widget overview-widget--wide"
              onClick={() => setOverviewDetail("nationality")}
              aria-label="View Nationality details"
            >
              <div className="overview-widget-header">
                <h3 className="overview-widget-title">Players by country</h3>
                <span className="overview-widget-hint">View details</span>
              </div>
              <div className="overview-country-preview">
                {overviewData.topCountries.slice(0, 4).map((c) => (
                  <div key={c.name} className="overview-country-preview-row">
                    <span className="overview-country-name">{c.name}</span>
                    <span className="overview-country-pct">{c.pct}%</span>
                    <div className="overview-country-bar-wrap">
                      <div className="overview-country-bar" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </button>
          </div>

          {/* Overview detail modal */}
          {overviewDetail && (
            <div className="modal-overlay" onClick={closeOverviewDetail} role="dialog" aria-modal="true" aria-labelledby="overview-detail-title">
              <div className="modal modal--wide overview-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="overview-detail-header">
                  <h2 id="overview-detail-title">
                    {overviewDetail === "ccu" && "Peak CCU"}
                    {overviewDetail === "dailyUsers" && "Daily users"}
                    {overviewDetail === "visits" && "Visits"}
                    {overviewDetail === "playTime" && "Average play time"}
                    {overviewDetail === "age" && "User age distribution"}
                    {overviewDetail === "nationality" && "Players by country"}
                  </h2>
                  <span className="overview-detail-period">
                    {period === "24h" ? "Last 24 hours" : period === "7d" ? "Last 7 days" : "Last 30 days"}
                  </span>
                  <button type="button" className="overview-detail-close" onClick={closeOverviewDetail} aria-label="Close">
                    ×
                  </button>
                </div>

                {overviewDetail === "ccu" && (
                  <div className="overview-detail-body">
                    <p className="overview-detail-summary">Peak concurrent users: <strong>{overviewData.ccuPeak}</strong></p>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={overviewData.ccuSeries} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} name="CCU" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {overviewDetail === "dailyUsers" && (
                  <div className="overview-detail-body">
                    <p className="overview-detail-summary">Total daily users: <strong>{overviewData.dailyUsersPeak.toLocaleString()}</strong></p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={overviewData.dailyUsersSeries} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Users" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {overviewDetail === "visits" && (
                  <div className="overview-detail-body">
                    <p className="overview-detail-summary">Total visits: <strong>{overviewData.visitsPeak.toLocaleString()}</strong></p>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={overviewData.visitsSeries} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="var(--success)" strokeWidth={2} dot={{ r: 4 }} name="Visits" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {overviewDetail === "playTime" && (
                  <div className="overview-detail-body">
                    <p className="overview-detail-summary">Average session length: <strong>{overviewData.avgPlayTimeMinutes} min</strong></p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={overviewData.playTimeSeries} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="var(--accent-alt)" radius={[4, 4, 0, 0]} name="Minutes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {overviewDetail === "age" && (
                  <div className="overview-detail-body">
                    <p className="overview-detail-summary">Average age: <strong>{overviewData.avgAge}</strong></p>
                    <div className="overview-detail-double">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={overviewData.ageBuckets}
                            dataKey="value"
                            nameKey="range"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ range, value }: { range: string; value: number }) => `${range} ${value}%`}
                            activeShape={false}
                          >
                            {overviewData.ageBuckets.map((_, i) => (
                              <Cell key={i} fill={["#00a76f", "#3b82f6", "#7c3aed", "#e9b308"][i]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <ul className="overview-detail-legend">
                        {overviewData.ageBuckets.map((b) => (
                          <li key={b.range}><span className="overview-detail-legend-label">{b.range}</span> <strong>{b.value}%</strong></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {overviewDetail === "nationality" && (
                  <div className="overview-detail-body">
                    <div className="overview-country-list">
                      {overviewData.topCountries.map((c) => (
                        <div key={c.name} className="overview-country-row">
                          <span className="overview-country-name">{c.name}</span>
                          <span className="overview-country-pct">{c.pct}%</span>
                          <div className="overview-country-bar-wrap">
                            <div className="overview-country-bar" style={{ width: `${c.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="overview-placeholder-note overview-detail-note">
                  Placeholder data. Connect Roblox Analytics API for real metrics.
                </p>
              </div>
            </div>
          )}

          {/* Feedback summary (from API) */}
          {analytics && (
            <>
              <h3 className="overview-section-title">Feedback summary</h3>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-card__value">{analytics.total}</div>
                  <div className="stat-card__label">Total reports</div>
                </div>
                <div className="stat-card stat-card--warn">
                  <div className="stat-card__value">{analytics.openCount}</div>
                  <div className="stat-card__label">Open</div>
                </div>
                <div className="stat-card stat-card--success">
                  <div className="stat-card__value">{analytics.resolvedCount}</div>
                  <div className="stat-card__label">Resolved</div>
                </div>
                <div className="stat-card stat-card--danger">
                  <div className="stat-card__value">{analytics.bugPct}%</div>
                  <div className="stat-card__label">Bug share</div>
                </div>
              </div>

              {(analytics.total > 0 || analytics.last7Days.some((d) => d.count > 0)) && (
                <div className="charts-row charts-row--overview">
                  {pieByType.length > 0 && (
                    <div className="chart-card chart-card--no-hover">
                      <h3 className="chart-card__title">By type</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieByType}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                            activeShape={false}
                          >
                            {pieByType.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {barByStatus.length > 0 && (
                    <div className="chart-card chart-card--no-hover">
                      <h3 className="chart-card__title">By status</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barByStatus} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} activeBar={false}>
                            {barByStatus.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {analytics.last7Days.length > 0 && (
                    <div className="chart-card chart-card--no-hover">
                      <h3 className="chart-card__title">Reports (last 7 days)</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analytics.last7Days} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip labelFormatter={(v: string) => v} />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} name="Reports" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <p className="overview-placeholder-note">
            CCU, visits, play time, age and country data are placeholders. Connect Roblox Analytics API to show real data.
          </p>
        </div>
      ) : (
        /* ========== FEEDBACK & REPORTS TAB ========== */
        <div className="feedback-panel">
          <div className="tabs">
            {["all", "bug_report", "feature_request", "general"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab ${categoryTab === tab ? "tab--active" : ""}`}
                onClick={() => setCategoryTab(tab)}
              >
                {tab === "all" ? "All" : TYPE_LABELS[tab] ?? tab}
              </button>
            ))}
          </div>

          <div className="feedback-toolbar">
            <input
              type="search"
              className="search-input"
              placeholder="Search feedback…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search"
            />
            {selectedIds.size > 0 && (
              <button
                type="button"
                className="btn-danger"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                Delete selected ({selectedIds.size})
              </button>
            )}
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="empty-state">
              <p>
                {feedback.length === 0
                  ? "No feedback yet. Submit feedback from your Roblox game to see it here."
                  : "No items match the current filters."}
              </p>
            </div>
          ) : (
            <div className="feedback-table-wrap">
              <table className="feedback-table">
                <thead>
                  <tr>
                    <th className="cell-check">
                      <input
                        type="checkbox"
                        checked={filteredFeedback.length > 0 && selectedIds.size === filteredFeedback.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="cell-type">Type</th>
                    <th className="cell-status">Status</th>
                    <th className="cell-body">Feedback</th>
                    <th className="cell-date">Date</th>
                    <th className="cell-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedback.map((item) => (
                    <tr key={item.id}>
                      <td className="cell-check">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.id}`}
                        />
                      </td>
                      <td className="cell-type">
                        <span className={`badge badge--type-${item.type}`}>
                          {TYPE_LABELS[item.type] ?? item.type}
                        </span>
                      </td>
                      <td className="cell-status">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          aria-label="Status"
                          className="badge-select"
                        >
                          {(["new", "triaged", "resolved", "ignored"] as const).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="cell-body">
                        <div className="body-preview" title={item.body}>
                          {item.body}
                        </div>
                        {item.developerNotes && (
                          <div className="feedback-item-notes" style={{ marginTop: 4 }}>
                            Note: {item.developerNotes}
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="Add note…"
                          defaultValue={item.developerNotes ?? ""}
                          onBlur={(e) => handleNotesBlur(item.id, e.target.value.trim() || null)}
                          className="modal-input"
                          style={{ marginTop: 6, padding: 6, fontSize: 12 }}
                        />
                      </td>
                      <td className="cell-date">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleDeleteOne(item.id)}
                          aria-label="Delete"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
