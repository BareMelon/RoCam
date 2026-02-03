import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { GamesPage } from "./pages/Games";
import { GameDetailPage } from "./pages/GameDetail";
import { SettingsPage } from "./pages/Settings";

export const App = () => (
  <Layout>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/games/:gameId" element={<GameDetailPage />} />
      <Route path="/games/:gameId/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/games" replace />} />
    </Routes>
  </Layout>
);
