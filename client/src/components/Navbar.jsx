import {
  Activity,
  Bell,
  ChevronDown,
  Gauge,
  Menu,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

const NAVIGATION_ITEMS = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: Gauge,
  },
  {
    id: "alerts",
    label: "Alertes",
    icon: Bell,
  },
  {
    id: "thresholds",
    label: "Seuils",
    icon: SlidersHorizontal,
  },
  {
    id: "settings",
    label: "Paramètres",
    icon: Settings,
  },
];

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
    `Machine ${getMachineId(machine) ?? ""}`
  );
}

function getMachineCode(
  machine
) {
  return (
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

export default function Navbar({
  activePage = "dashboard",
  onNavigate,
  machines = [],
  selectedMachineId,
  onMachineChange,
}) {
  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

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

  function handleNavigation(
    pageId
  ) {
    onNavigate?.(pageId);
    setMobileOpen(false);
  }

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

    onMachineChange?.(
      machine ??
      value
    );
  }

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
              Aucune machine
            </div>
          )}

          {selectedMachine ? (
            <div className="navbar-machine-info">
              <div>
                <span>
                  Identifiant
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

        <nav
          className="navbar-navigation"
          aria-label="Navigation principale"
        >
          <span className="navbar-section-label">
            Navigation
          </span>

          {NAVIGATION_ITEMS.map(
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

        <div className="navbar-footer">
          <span>
            Système de diagnostic
          </span>

          <strong>
            Version 1.0.0
          </strong>
        </div>
      </aside>
    </>
  );
}
