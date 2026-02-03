import { ReactNode } from "react";
import { TopNav } from "./TopNav";

type LayoutProps = {
  children: ReactNode;
};

export const Layout = ({ children }: LayoutProps) => (
  <div className="app-shell app-shell--topnav">
    <TopNav />
    <main className="app-main" id="main-content">
      {children}
    </main>
  </div>
);
