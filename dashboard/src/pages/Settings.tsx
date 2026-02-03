import { Link, useParams } from "react-router-dom";
import { IconChevronLeft } from "../components/Icons";

export const SettingsPage = () => {
  const { gameId } = useParams();

  return (
    <section className="card">
      <div className="page-actions-row">
        <Link to={gameId ? `/games/${gameId}` : "/games"} className="btn-back">
          <IconChevronLeft />
          Back to feedback
        </Link>
      </div>
      <h1>Game settings</h1>
      <p className="settings-game-id">Game: {gameId}</p>
      <div className="settings-grid">
        <label>
          <input type="checkbox" /> Categories enabled
        </label>
        <label>
          <input type="checkbox" /> Severity enabled
        </label>
        <label>
          <input type="checkbox" /> Attachments enabled
        </label>
        <label>
          <input type="checkbox" /> Status visibility
        </label>
      </div>
    </section>
  );
};
