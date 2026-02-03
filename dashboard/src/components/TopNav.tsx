import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { IconDashboard, IconChevronDown, IconLogout } from "./Icons";

const dropdownItems = [
  { path: "/games", label: "All experiences" },
  { path: "https://create.roblox.com", label: "Roblox", external: true },
  { path: "https://create.roblox.com/docs", label: "Docs", external: true },
];

export const TopNav = () => {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDashboard =
    location.pathname === "/games" ||
    location.pathname === "/" ||
    location.pathname.startsWith("/games/");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="topnav" role="banner">
      <div className="topnav-left">
        <Link to="/games" className="topnav-brand" aria-label="Feedback home">
          <span className="topnav-brand-initials">FB</span>
        </Link>
        <nav className="topnav-pill" aria-label="Main navigation">
          <Link
            to="/games"
            className={`topnav-pill-item ${isDashboard ? "topnav-pill-item--active" : ""}`}
          >
            <IconDashboard />
            <span>Dashboard</span>
          </Link>
          <div className="topnav-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`topnav-pill-item topnav-pill-item--dropdown ${dropdownOpen ? "topnav-pill-item--open" : ""}`}
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="More menu"
            >
              <span>More</span>
              <IconChevronDown />
            </button>
            {dropdownOpen && (
              <div className="topnav-dropdown-menu" role="menu">
                {dropdownItems.map((item) =>
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="topnav-dropdown-item"
                      role="menuitem"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.path}
                      className="topnav-dropdown-item"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
      <div className="topnav-right">
        <Link to="/login" className="topnav-logout" aria-label="Sign in">
          <IconLogout />
          <span>Sign in</span>
        </Link>
      </div>
    </header>
  );
};
