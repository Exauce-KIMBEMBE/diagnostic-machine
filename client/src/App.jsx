import { useEffect, useState } from "react";

import Navbar from "./components/Navbar.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";
import Login from "./pages/Login.jsx";

import "./App.css";

const PAGES = {
  DASHBOARD: "dashboard",
  SETTINGS: "settings",
};

export default function App() {
  //====================================================
  // AUTHENTIFICATION
  //====================================================

  const [token, setToken] = useState(() => {
    return localStorage.getItem("authToken");
  });

  const [user, setUser] = useState(null);

  const [machines, setMachines] = useState([]);

  const [selectedMachineId, setSelectedMachineId] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(Boolean(token));

  //====================================================
  // NAVIGATION
  //====================================================

  const [currentPage, setCurrentPage] = useState(
    PAGES.DASHBOARD
  );

  //====================================================
  // VÉRIFICATION DE LA SESSION
  //====================================================

  useEffect(() => {
    if (!token) {
      setUser(null);
      setMachines([]);
      setSelectedMachineId(null);
      setAuthLoading(false);
      return;
    }

    async function loadCurrentUser() {
      try {
        setAuthLoading(true);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/me`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Session invalide"
          );
        }

        const data =
          await response.json();

        const currentUser =
          data.user || null;

        const currentMachines =
          Array.isArray(data.machines)
            ? data.machines
            : [];

        setUser(currentUser);

        setMachines(
          currentMachines
        );

        if (
          currentMachines.length > 0
        ) {
          setSelectedMachineId(
            currentMachines[0].id
          );
        } else {
          setSelectedMachineId(
            null
          );
        }
      } catch (error) {
        console.error(
          "Erreur de session :",
          error
        );

        localStorage.removeItem(
          "authToken"
        );

        setToken(null);
        setUser(null);
        setMachines([]);
        setSelectedMachineId(null);
      } finally {
        setAuthLoading(false);
      }
    }

    loadCurrentUser();
  }, [token]);

  //====================================================
  // CONNEXION
  //====================================================

  function handleLogin(
    authData
  ) {
    const newToken =
      authData?.token;

    if (!newToken) {
      return;
    }

    localStorage.setItem(
      "authToken",
      newToken
    );

    setToken(newToken);

    if (authData.user) {
      setUser(
        authData.user
      );
    }

    if (
      Array.isArray(
        authData.machines
      )
    ) {
      setMachines(
        authData.machines
      );

      if (
        authData.machines.length > 0
      ) {
        setSelectedMachineId(
          authData.machines[0].id
        );
      }
    }

    setCurrentPage(
      PAGES.DASHBOARD
    );
  }

  //====================================================
  // DÉCONNEXION
  //====================================================

  function handleLogout() {
    localStorage.removeItem(
      "authToken"
    );

    setToken(null);

    setUser(null);

    setMachines([]);

    setSelectedMachineId(
      null
    );

    setCurrentPage(
      PAGES.DASHBOARD
    );
  }

  //====================================================
  // CHANGEMENT DE MACHINE
  //====================================================

  function handleMachineChange(
    machineId
  ) {
    const parsedMachineId =
      Number(machineId);

    if (
      !Number.isInteger(
        parsedMachineId
      ) ||
      parsedMachineId <= 0
    ) {
      return;
    }

    setSelectedMachineId(
      parsedMachineId
    );

    setCurrentPage(
      PAGES.DASHBOARD
    );
  }

  //====================================================
  // NAVIGATION
  //====================================================

  function handleNavigate(
    page
  ) {
    if (
      page === PAGES.SETTINGS
    ) {
      setCurrentPage(
        PAGES.SETTINGS
      );

      return;
    }

    setCurrentPage(
      PAGES.DASHBOARD
    );
  }

  function openDashboard() {
    setCurrentPage(
      PAGES.DASHBOARD
    );
  }

  function openSettings() {
    setCurrentPage(
      PAGES.SETTINGS
    );
  }

  //====================================================
  // CHARGEMENT
  //====================================================

  if (authLoading) {
    return (
      <div className="app-loading">
        Chargement...
      </div>
    );
  }

  //====================================================
  // NON CONNECTÉ
  //====================================================

  if (!token || !user) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  //====================================================
  // APPLICATION
  //====================================================

  return (
    <div className="app-shell">
      <Navbar
        activePage={currentPage}

        onNavigate={
          handleNavigate
        }

        user={user}

        machines={machines}

        selectedMachineId={
          selectedMachineId
        }

        onMachineChange={
          handleMachineChange
        }

        onLogout={
          handleLogout
        }
      />

      <main className="app-main">
        {currentPage ===
        PAGES.SETTINGS ? (
          <Settings
            onBack={
              openDashboard
            }

            token={token}

            user={user}

            machineId={
              selectedMachineId
            }
          />
        ) : (
          <Dashboard
            onOpenSettings={
              openSettings
            }

            token={token}

            user={user}

            machines={
              machines
            }

            machineId={
              selectedMachineId
            }
          />
        )}
      </main>
    </div>
  );
}
