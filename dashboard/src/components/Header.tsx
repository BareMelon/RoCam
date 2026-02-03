import { Link, useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/games": "Experiences",
  "/login": "Sign in",
};

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith("/games/") && pathname.endsWith("/settings")) return "Settings";
  if (pathname.match(/^\/games\/[^/]+$/)) return "Feedback";
  return pageTitles[pathname] ?? "Experiences";
};

export const Header = () => {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <header className="topbar" role="banner">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-actions">
        <Link to="/login" className="topbar-avatar" aria-label="Account / Sign in">
          <span className="topbar-avatar-dot" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
};
