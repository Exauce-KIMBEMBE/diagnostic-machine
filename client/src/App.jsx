import { useCallback, useMemo, useState } from "react";

import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";

import "./App.css";

const PAGES = {
  DASHBOARD: "dashboard",
  SETTINGS: "settings",
};

export default function App() {
  const [currentPage, setCurrentPage] = useState(
    PAGES.DASHBOARD
  );

  const openDashboard = useCallback(() => {
    setCurrentPage(PAGES.DASHBOARD);
  }, []);

  const openSettings = useCallback(() => {
    setCurrentPage(PAGES.SETTINGS);
  }, []);

  const currentView = useMemo(() => {
    switch (currentPage) {
      case PAGES.SETTINGS:
        return (
          <Settings
            onBack={openDashboard}
          />
        );

      case PAGES.DASHBOARD:
      default:
        return (
          <Dashboard
            onOpenSettings={
              openSettings
            }
          />
        );
    }
  }, [
    currentPage,
    openDashboard,
    openSettings,
  ]);

  return (
    <div className="app-shell">
      {currentView}
    </div>
  );
}
