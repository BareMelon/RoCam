import { Link, useLocation } from "react-router-dom";
import { IconExperiences } from "./Icons";

const navItems = [{ path: "/games", label: "Experiences", icon: IconExperiences }];

export const Sidebar = () => {
  const location = useLocation();
  const isExperiences =
    location.pathname === "/games" ||
    location.pathname === "/" ||
    location.pathname.startsWith("/games/");

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">FEEDBACK</div>
      <Link to="/login" className="sidebar-user">
        <div className="sidebar-user-avatar" aria-hidden="true" />
        <span className="sidebar-user-name">Guest</span>
      </Link>
      <nav className="sidebar-nav">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={label}
            to={path}
            className={`sidebar-nav-item ${isExperiences ? "sidebar-nav-item--active" : ""}`}
          >
            <span className="sidebar-nav-icon">
              <Icon />
            </span>
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <a href="https://create.roblox.com" target="_blank" rel="noopener noreferrer" className="sidebar-footer-link">
          Roblox
        </a>
        <a href="https://create.roblox.com/docs" target="_blank" rel="noopener noreferrer" className="sidebar-footer-link">
          Docs
        </a>
      </div>
    </aside>
  );
};
