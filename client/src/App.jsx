import { useEffect, useState } from "react";

import Navbar from "./components/Navbar.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import "./App.css";

//======================================================
// PAGES DE L'APPLICATION
//======================================================

const PAGES = {
  DASHBOARD: "dashboard",
  SETTINGS: "settings",
};

//======================================================
// PAGES D'AUTHENTIFICATION
//======================================================

const AUTH_PAGES = {
  LOGIN: "login",
  REGISTER: "register",
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

  const [authPage, setAuthPage] =
    useState(AUTH_PAGES.LOGIN);

  //====================================================
  // NAVIGATION
  //====================================================

  const [currentPage, setCurrentPage] = useState(
    PAGES.DASHBOARD
  );

  //====================================================
  // VÉRIFICATION DE LA SESSION AU DÉMARRAGE
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

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Session invalide."
          );
        }

        const currentUser =
          data?.user || null;

        const currentMachines =
          Array.isArray(data?.machines)
            ? data.machines
            : [];

        if (!currentUser) {
          throw new Error(
            "Utilisateur introuvable."
          );
        }

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

        setSelectedMachineId(
          null
        );

        setAuthPage(
          AUTH_PAGES.LOGIN
        );
      } finally {
        setAuthLoading(false);
      }
    }

    loadCurrentUser();
  }, [token]);

  //====================================================
  // TRAITEMENT APRÈS CONNEXION / INSCRIPTION
  //====================================================

  function handleAuthentication(
    authData
  ) {
    const newToken =
      authData?.token;

    if (!newToken) {
      console.error(
        "Aucun token reçu."
      );

      return;
    }

    const authenticatedUser =
      authData?.user || null;

    const authenticatedMachines =
      Array.isArray(
        authData?.machines
      )
        ? authData.machines
        : [];

    // Sauvegarde du JWT
    localStorage.setItem(
      "authToken",
      newToken
    );

    // Mise à jour de la session
    setToken(newToken);

    setUser(
      authenticatedUser
    );

    setMachines(
      authenticatedMachines
    );

    // Sélection automatique de la première machine
    if (
      authenticatedMachines.length >
      0
    ) {
      setSelectedMachineId(
        authenticatedMachines[0].id
      );
    } else {
      setSelectedMachineId(
        null
      );
    }

    // Retour au dashboard
    setCurrentPage(
      PAGES.DASHBOARD
    );

    setAuthPage(
      AUTH_PAGES.LOGIN
    );
  }

  //====================================================
  // CONNEXION
  //====================================================

  function handleLogin(
    authData
  ) {
    handleAuthentication(
      authData
    );
  }

  //====================================================
  // INSCRIPTION
  //====================================================

  function handleRegister(
    authData
  ) {
    handleAuthentication(
      authData
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

    setAuthPage(
      AUTH_PAGES.LOGIN
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

    const machineExists =
      machines.some(
        (machine) =>
          Number(machine.id) ===
          parsedMachineId
      );

    if (!machineExists) {
      console.error(
        "Machine non autorisée."
      );

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
  // NAVIGATION DASHBOARD / PARAMÈTRES
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
  // NAVIGATION AUTHENTIFICATION
  //====================================================

  function openLogin() {
    setAuthPage(
      AUTH_PAGES.LOGIN
    );
  }

  function openRegister() {
    setAuthPage(
      AUTH_PAGES.REGISTER
    );
  }

  //====================================================
  // CHARGEMENT DE LA SESSION
  //====================================================

  if (authLoading) {
    return (
      <div className="app-loading">
        Chargement de votre session...
      </div>
    );
  }

  //====================================================
  // UTILISATEUR NON CONNECTÉ
  //====================================================

  if (!token || !user) {
    if (
      authPage ===
      AUTH_PAGES.REGISTER
    ) {
      return (
        <Register
          onRegister={
            handleRegister
          }

          onBackToLogin={
            openLogin
          }
        />
      );
    }

    return (
      <Login
        onLogin={
          handleLogin
        }

        onOpenRegister={
          openRegister
        }
      />
    );
  }

  //====================================================
  // APPLICATION CONNECTÉE
  //====================================================

  return (
    <div className="app-shell">
      <Navbar
        activePage={
          currentPage
        }

        onNavigate={
          handleNavigate
        }

        user={
          user
        }

        machines={
          machines
        }

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

            token={
              token
            }

            user={
              user
            }

            machineId={
              selectedMachineId
            }
          />
        ) : (
          <Dashboard
            onOpenSettings={
              openSettings
            }

            token={
              token
            }

            user={
              user
            }

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
