import { useState } from "react";

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

  function openDashboard() {
    setCurrentPage(PAGES.DASHBOARD);
  }

  function openSettings() {
    setCurrentPage(PAGES.SETTINGS);
  }

  return (
    <div className="app-shell">
      {currentPage === PAGES.SETTINGS ? (
        <Settings onBack={openDashboard} />
      ) : (
        <Dashboard
          onOpenSettings={openSettings}
        />
      )}
    </div>
  );
}
