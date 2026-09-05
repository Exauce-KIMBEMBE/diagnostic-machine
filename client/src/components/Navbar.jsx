import {
  Activity,
  Bell,
  ChevronDown,
  Gauge,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

//======================================================
// NAVIGATION
//======================================================

const NAVIGATION_ITEMS = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: Gauge,
    managerOnly: false,
  },
  {
    id: "alerts",
    label: "Alertes",
    icon: Bell,
    managerOnly: false,
  },
  {
    id: "thresholds",
    label: "Seuils",
    icon: SlidersHorizontal,
    managerOnly: false,
  },
  {
    id: "settings",
    label: "Paramètres",
    icon: Settings,
    managerOnly: true,
  },
];

//======================================================
// MACHINE
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

function getMachineName(
  machine
) {
  return (
    machine?.name ??
    machine?.machineName ??
    machine?.machine_name ??
    machine?.label ??
    `Machine ${
      getMachineId(machine) ?? ""
    }`
  );
}

function getMachineCode(
  machine
) {
  return (
    machine?.serial_number ??
    machine?.serialNumber ??
    machine?.serial ??
    machine?.code ??
    machine?.identifier ??
    machine?.machineCode ??
    machine?.machine_code ??
    getMachineId(machine) ??
    "--"
  );
}

function isMachineOnline(
  machine
) {
  if (
    typeof machine?.online ===
    "boolean"
  ) {
    return machine.online;
  }

  const status =
    String(
      machine?.status ??
        machine?.connectionStatus ??
        machine?.connection_status ??
        ""
    ).toLowerCase();

  return [
    "online",
    "connected",
    "active",
    "normal",
  ].includes(status);
}

//======================================================
// UTILISATEUR
//======================================================

function getUserName(
  user
) {
  return (
    user?.name ??
    user?.username ??
    "Utilisateur"
  );
}

function getUserEmail(
  user
) {
  return (
    user?.email ??
    ""
  );
}

function getUserRole(
  user
) {
  return String(
    user?.role ?? "client"
  ).toLowerCase();
}

function getRoleLabel(
  role
) {
  if (role === "manager") {
    return "Manager";
  }

  return "Client";
}

//======================================================
// COMPOSANT
//======================================================

export default function Navbar({
  activePage = "dashboard",

  onNavigate,

  user = null,

  machines = [],

  selectedMachineId,

  onMachineChange,

  onLogout,
}) {
  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  //====================================================
  // UTILISATEUR CONNECTÉ
  //====================================================

  const userRole =
    getUserRole(user);

  const isManager =
    userRole === "manager";

  //====================================================
  // MACHINES AUTORISÉES
  //====================================================

  const safeMachines =
    Array.isArray(machines)
      ? machines
      : [];

  const selectedMachine =
    safeMachines.find(
      (machine) =>
        String(
          getMachineId(
            machine
          )
        ) ===
        String(
          selectedMachineId
        )
    ) ??
    safeMachines[0] ??
    null;

  const machineOnline =
    isMachineOnline(
      selectedMachine
    );

  //====================================================
  // NAVIGATION
  //====================================================

  function handleNavigation(
    pageId
  ) {
    onNavigate?.(
      pageId
    );

    setMobileOpen(
      false
    );
  }

  //====================================================
  // CHANGEMENT DE MACHINE
  //====================================================

  function handleMachineChange(
    event
  ) {
    const value =
      event.target.value;

    const machine =
      safeMachines.find(
        (item) =>
          String(
            getMachineId(
              item
            )
          ) ===
          String(value)
      );

    if (!machine) {
      return;
    }

    const machineId =
      getMachineId(
        machine
      );

    if (
      machineId === null ||
      machineId === undefined
    ) {
      return;
    }

    onMachineChange?.(
      machineId
    );

    setMobileOpen(
      false
    );
  }

  //====================================================
  // DÉCONNEXION
  //====================================================

  function handleLogout() {
    setMobileOpen(
      false
    );

    onLogout?.();
  }

  //====================================================
  // NAVIGATION AUTORISÉE
  //====================================================

  const visibleNavigationItems =
    NAVIGATION_ITEMS.filter(
      (item) => {
        if (
          item.managerOnly &&
          !isManager
        ) {
          return false;
        }

        return true;
      }
    );

  //====================================================
  // AFFICHAGE
  //====================================================

  return (
    <>
      <button
        className="navbar-mobile-toggle"
        type="button"
        onClick={() =>
          setMobileOpen(
            (current) =>
              !current
          )
        }
        aria-label={
          mobileOpen
            ? "Fermer le menu"
            : "Ouvrir le menu"
        }
        aria-expanded={
          mobileOpen
        }
      >
        {mobileOpen ? (
          <X size={22} />
        ) : (
          <Menu size={22} />
        )}
      </button>

      {mobileOpen ? (
        <button
          className="navbar-overlay"
          type="button"
          aria-label="Fermer le menu"
          onClick={() =>
            setMobileOpen(
              false
            )
          }
        />
      ) : null}

      <aside
        className={`navbar ${
          mobileOpen
            ? "navbar-open"
            : ""
        }`}
      >
        {/* ============================================
            MARQUE
        ============================================ */}

        <div className="navbar-brand">
          <div className="navbar-logo">
            <Activity
              size={25}
            />
          </div>

          <div>
            <strong>
              Diagnostic
            </strong>

            <span>
              Machine Monitor
            </span>
          </div>
        </div>

        {/* ============================================
            UTILISATEUR CONNECTÉ
        ============================================ */}

        <div className="navbar-user">
          <span className="navbar-section-label">
            Compte connecté
          </span>

          <div className="navbar-user-card">
            <div className="navbar-user-icon">
              <User
                size={19}
              />
            </div>

            <div className="navbar-user-info">
              <strong>
                {getUserName(
                  user
                )}
              </strong>

              {getUserEmail(
                user
              ) ? (
                <span>
                  {getUserEmail(
                    user
                  )}
                </span>
              ) : null}
            </div>
          </div>

          <div
            className={`navbar-role ${
              isManager
                ? "navbar-role-manager"
                : "navbar-role-client"
            }`}
          >
            {getRoleLabel(
              userRole
            )}
          </div>
        </div>

        {/* ============================================
            MACHINE ACTIVE
        ============================================ */}

        <div className="navbar-machine">
          <span className="navbar-section-label">
            Machine active
          </span>

          {safeMachines.length >
          0 ? (
            <div className="navbar-machine-select-wrapper">
              <select
                className="navbar-machine-select"
                value={
                  getMachineId(
                    selectedMachine
                  ) ?? ""
                }
                onChange={
                  handleMachineChange
                }
              >
                {safeMachines.map(
                  (machine) => {
                    const machineId =
                      getMachineId(
                        machine
                      );

                    return (
                      <option
                        key={
                          machineId ??
                          getMachineName(
                            machine
                          )
                        }
                        value={
                          machineId ??
                          ""
                        }
                      >
                        {getMachineName(
                          machine
                        )}
                      </option>
                    );
                  }
                )}
              </select>

              <ChevronDown
                className="navbar-select-icon"
                size={17}
              />
            </div>
          ) : (
            <div className="navbar-no-machine">
              Aucune machine associée
            </div>
          )}

          {selectedMachine ? (
            <div className="navbar-machine-info">
              <div>
                <span>
                  Numéro de série
                </span>

                <strong>
                  {getMachineCode(
                    selectedMachine
                  )}
                </strong>
              </div>

              <div
                className={`navbar-machine-status ${
                  machineOnline
                    ? "online"
                    : "offline"
                }`}
              >
                <span />

                {machineOnline
                  ? "En ligne"
                  : "Hors ligne"}
              </div>
            </div>
          ) : null}
        </div>

        {/* ============================================
            NAVIGATION
        ============================================ */}

        <nav
          className="navbar-navigation"
          aria-label="Navigation principale"
        >
          <span className="navbar-section-label">
            Navigation
          </span>

          {visibleNavigationItems.map(
            ({
              id,
              label,
              icon: Icon,
            }) => (
              <button
                className={`navbar-link ${
                  activePage === id
                    ? "active"
                    : ""
                }`}
                key={id}
                type="button"
                onClick={() =>
                  handleNavigation(
                    id
                  )
                }
              >
                <Icon
                  size={20}
                />

                <span>
                  {label}
                </span>
              </button>
            )
          )}
        </nav>

        {/* ============================================
            BAS DU MENU
        ============================================ */}

        <div className="navbar-footer">
          <button
            type="button"
            className="navbar-logout"
            onClick={
              handleLogout
            }
          >
            <LogOut
              size={18}
            />

            <span>
              Déconnexion
            </span>
          </button>

          <div className="navbar-version">
            <span>
              Système de diagnostic
            </span>

            <strong>
              Version 1.0.0
            </strong>
          </div>
        </div>
      </aside>
    </>
  );
}
