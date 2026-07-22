import { useState } from "react";

import Navbar from "./components/Navbar.jsx";
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

  function handleNavigate(page) {
    if (page === PAGES.SETTINGS) {
      setCurrentPage(PAGES.SETTINGS);
      return;
    }

    setCurrentPage(PAGES.DASHBOARD);
  }

  function openDashboard() {
    setCurrentPage(PAGES.DASHBOARD);
  }

  function openSettings() {
    setCurrentPage(PAGES.SETTINGS);
  }

  return (
    <div className="app-shell">
      <Navbar
        activePage={currentPage}
        onNavigate={handleNavigate}
      />

      <main className="app-main">
        {currentPage === PAGES.SETTINGS ? (
          <Settings onBack={openDashboard} />
        ) : (
          <Dashboard
            onOpenSettings={openSettings}
          />
        )}
      </main>
    </div>
  );
}
