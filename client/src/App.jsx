import {
  useEffect,
  useState,
} from "react";

import Navbar from "./components/Navbar.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Alerts from "./pages/Alerts.jsx";
import Settings from "./pages/Settings.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import "./App.css";

//======================================================
// PAGES
//======================================================

const PAGES = {
  DASHBOARD:
    "dashboard",

  ALERTS:
    "alerts",

  SETTINGS:
    "settings",
};

//======================================================
// AUTH
//======================================================

const AUTH_PAGES = {
  LOGIN:
    "login",

  REGISTER:
    "register",
};

//======================================================
// API
//======================================================

const API_URL =
  import.meta.env
    .VITE_API_URL;

//======================================================
// OUTILS
//======================================================

function getMachineId(
  machine
) {
  return (
    machine?.id ??
    machine?.machineId ??
    machine?.machine_id ??
    null
  );
}

//======================================================
// APP
//======================================================

export default function App() {
  //====================================================
  // AUTH TOKEN
  //====================================================

  const [
    token,
    setToken,
  ] = useState(() =>
    localStorage.getItem(
      "authToken"
    )
  );

  //====================================================
  // UTILISATEUR
  //====================================================

  const [
    user,
    setUser,
  ] = useState(null);

  //====================================================
  // MACHINES
  //====================================================

  const [
    machines,
    setMachines,
  ] = useState([]);

  const [
    selectedMachineId,
    setSelectedMachineId,
  ] = useState(null);

  //====================================================
  // AUTH LOADING
  //====================================================

  const [
    authLoading,
    setAuthLoading,
  ] = useState(
    Boolean(token)
  );

  //====================================================
  // PAGE AUTH
  //====================================================

  const [
    authPage,
    setAuthPage,
  ] = useState(
    AUTH_PAGES.LOGIN
  );

  //====================================================
  // PAGE APPLICATION
  //====================================================

  const [
    currentPage,
    setCurrentPage,
  ] = useState(
    PAGES.DASHBOARD
  );

  //====================================================
  // SESSION EXISTANTE
  //====================================================

  useEffect(() => {
    if (!token) {
      setAuthLoading(
        false
      );

      return;
    }

    let cancelled =
      false;

    async function loadCurrentUser() {
      try {
        setAuthLoading(
          true
        );

        const response =
          await fetch(
            `${API_URL}/api/auth/me`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data?.message ||
              "Session invalide"
          );
        }

        if (cancelled) {
          return;
        }

        const receivedUser =
          data?.user ??
          data?.data?.user ??
          null;

        const receivedMachines =
          data?.machines ??
          data?.data
            ?.machines ??
          [];

        const safeMachines =
          Array.isArray(
            receivedMachines
          )
            ? receivedMachines
            : [];

        setUser(
          receivedUser
        );

        setMachines(
          safeMachines
        );

        setSelectedMachineId(
          safeMachines.length >
            0
            ? getMachineId(
                safeMachines[
                  0
                ]
              )
            : null
        );
      } catch (error) {
        console.error(
          "Erreur récupération utilisateur :",
          error
        );

        if (cancelled) {
          return;
        }

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
      } finally {
        if (!cancelled) {
          setAuthLoading(
            false
          );
        }
      }
    }

    loadCurrentUser();

    return () => {
      cancelled =
        true;
    };
  }, [
    token,
  ]);

  //====================================================
  // AUTHENTIFICATION RÉUSSIE
  //====================================================

  function handleAuthentication(
    authData
  ) {
    const receivedToken =
      authData?.token ??
      authData?.data?.token;

    const receivedUser =
      authData?.user ??
      authData?.data?.user ??
      null;

    const receivedMachines =
      authData?.machines ??
      authData?.data
        ?.machines ??
      [];

    if (!receivedToken) {
      console.error(
        "Token JWT absent après authentification."
      );

      return;
    }

    const safeMachines =
      Array.isArray(
        receivedMachines
      )
        ? receivedMachines
        : [];

    localStorage.setItem(
      "authToken",
      receivedToken
    );

    setToken(
      receivedToken
    );

    setUser(
      receivedUser
    );

    setMachines(
      safeMachines
    );

    setSelectedMachineId(
      safeMachines.length >
        0
        ? getMachineId(
            safeMachines[
              0
            ]
          )
        : null
    );

    setCurrentPage(
      PAGES.DASHBOARD
    );

    setAuthPage(
      AUTH_PAGES.LOGIN
    );
  }

  //====================================================
  // LOGIN
  //====================================================

  function handleLogin(
    authData
  ) {
    handleAuthentication(
      authData
    );
  }

  //====================================================
  // REGISTER
  //====================================================

  function handleRegister(
    authData
  ) {
    handleAuthentication(
      authData
    );
  }

  //====================================================
  // LOGOUT
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
  // CHANGEMENT MACHINE
  //====================================================

  function handleMachineChange(
    machineId
  ) {
    const numericMachineId =
      Number(machineId);

    if (
      !Number.isInteger(
        numericMachineId
      ) ||
      numericMachineId <= 0
    ) {
      return;
    }

    const machineExists =
      machines.some(
        (machine) =>
          Number(
            getMachineId(
              machine
            )
          ) ===
          numericMachineId
      );

    if (!machineExists) {
      return;
    }

    setSelectedMachineId(
      numericMachineId
    );
  }

  //====================================================
  // NAVIGATION
  //====================================================

  function handleNavigate(
    page
  ) {
    if (
      page ===
      PAGES.DASHBOARD
    ) {
      setCurrentPage(
        PAGES.DASHBOARD
      );

      return;
    }

    if (
      page ===
      PAGES.ALERTS
    ) {
      setCurrentPage(
        PAGES.ALERTS
      );

      return;
    }

    if (
      page ===
      PAGES.SETTINGS
    ) {
      if (
        String(
          user?.role ??
            ""
        ).toLowerCase() !==
        "manager"
      ) {
        return;
      }

      setCurrentPage(
        PAGES.SETTINGS
      );

      return;
    }

    setCurrentPage(
      PAGES.DASHBOARD
    );
  }

  //====================================================
  // PARAMÈTRES
  //====================================================

  function openSettings() {
    if (
      String(
        user?.role ??
          ""
      ).toLowerCase() !==
      "manager"
    ) {
      return;
    }

    setCurrentPage(
      PAGES.SETTINGS
    );
  }

  function closeSettings() {
    setCurrentPage(
      PAGES.DASHBOARD
    );
  }

  //====================================================
  // AUTH PAGES
  //====================================================

  function openRegister() {
    setAuthPage(
      AUTH_PAGES.REGISTER
    );
  }

  function openLogin() {
    setAuthPage(
      AUTH_PAGES.LOGIN
    );
  }

  //====================================================
  // CHARGEMENT AUTH
  //====================================================

  if (authLoading) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="login-header">
            <strong>
              Diagnostic
            </strong>

            <span>
              Vérification de la session...
            </span>
          </div>
        </div>
      </main>
    );
  }

  //====================================================
  // NON CONNECTÉ
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
  // APPLICATION
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

      <div className="app-content">
        {/* ============================================
            ALERTES
        ============================================ */}

        {currentPage ===
          PAGES.ALERTS && (
          <Alerts
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

        {/* ============================================
            PARAMÈTRES
        ============================================ */}

        {currentPage ===
          PAGES.SETTINGS && (
          <Settings
            onBack={
              closeSettings
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
        )}

        {/* ============================================
            DASHBOARD
        ============================================ */}

        {currentPage ===
          PAGES.DASHBOARD && (
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
      </div>
    </div>
  );
}
