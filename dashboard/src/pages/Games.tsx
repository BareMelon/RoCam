import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getGames, createGameApi, type Game } from "../api/client";

export const GamesPage = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBetaKey, setAddBetaKey] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGames({ stats: true });
      setGames(res.games);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    if (!name || addSubmitting) return;
    setAddSubmitting(true);
    setError(null);
    try {
      const res = await createGameApi(name, addBetaKey.trim() || undefined);
      setGames((prev) => [
        { ...res.game, stats: { openCount: 0, bugPct: 0, reports7d: 0 } },
        ...prev
      ]);
      setCreatedApiKey(res.apiKey);
      setAddName("");
      setAddBetaKey("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add experience";
      const betaMatch = msg.includes("beta_access_required") || msg.includes("beta access");
      setError(betaMatch ? "A valid beta access key is required to add an experience. Enter your key above." : msg);
    } finally {
      setAddSubmitting(false);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddName("");
    setAddBetaKey("");
    setCreatedApiKey(null);
    setCopied(false);
  };

  return (
    <>
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Experiences</h2>
          <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
            Add experience
          </button>
        </div>
        {error && !showAddModal && (
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
        ) : games.length === 0 ? (
          <p className="empty-state">No experiences yet. Add one to start receiving feedback.</p>
        ) : (
          <div className="experience-grid" role="list">
            {games.map((game) => (
              <article key={game.id} className="experience-card" role="listitem">
                <Link to={`/games/${game.id}`} className="experience-card-link">
                  <div className="experience-card-thumb">
                    <span className="experience-card-thumb-badge">ROBLOX</span>
                    No thumbnail
                  </div>
                  <div className="experience-card-body">
                    <h3 className="experience-card-title">{game.name}</h3>
                    <div className="experience-card-meta">
                      <span className="experience-card-status">Private</span>
                    </div>
                    <div className="experience-card-stats">
                      <div className="experience-card-stats-row">
                        <span>Open</span>
                        <span>{game.stats != null ? game.stats.openCount : "—"}</span>
                      </div>
                      <div className="experience-card-stats-row">
                        <span>Bug %</span>
                        <span>{game.stats != null ? `${game.stats.bugPct}%` : "—"}</span>
                      </div>
                      <div className="experience-card-stats-row">
                        <span>Reports (7d)</span>
                        <span>{game.stats != null ? game.stats.reports7d : "—"}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal} role="dialog" aria-modal="true" aria-labelledby="add-experience-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="add-experience-title">Add experience</h2>
            {createdApiKey ? (
              <>
                <p>Experience added. Use this API key in your Roblox game (save it — it won’t be shown again):</p>
                <div className="modal-api-key">
                  <code>{createdApiKey}</code>
                  <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(createdApiKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                </div>
                <div className="button-row">
                  <button type="button" className="btn-primary" onClick={closeAddModal}>Done</button>
                </div>
              </>
            ) : (
              <form onSubmit={handleAddSubmit}>
                <label>
                  Name
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="My experience"
                    required
                    autoFocus
                    className="modal-input"
                  />
                </label>
                <label>
                  Beta access key <span className="label-optional">(required during closed beta)</span>
                  <input
                    type="text"
                    value={addBetaKey}
                    onChange={(e) => setAddBetaKey(e.target.value)}
                    placeholder="beta_xxxxxxxx..."
                    className="modal-input"
                    autoComplete="off"
                  />
                </label>
                <div className="button-row">
                  <button type="button" className="btn-secondary" onClick={closeAddModal}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={addSubmitting || !addName.trim()}>
                    {addSubmitting ? "Adding…" : "Add"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
