import { useState } from "react";

import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";

import "./App.css";

export default function App() {
  const [currentPage, setCurrentPage] =
    useState("dashboard");

  if (currentPage === "settings") {
    return (
      <Settings
        onBack={() =>
          setCurrentPage("dashboard")
        }
      />
    );
  }

  return (
    <Dashboard
      onOpenSettings={() =>
        setCurrentPage("settings")
      }
    />
  );
}