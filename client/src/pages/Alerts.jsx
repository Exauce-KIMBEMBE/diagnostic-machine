import {
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import AlertPanel from "../components/AlertPanel.jsx";

import {
  useMachineData,
} from "../hooks/useMachineData.js";

//======================================================
// OUTILS MACHINE
//======================================================

function getMachineId(machine) {
  return (
    machine?.id ??
    machine?.machineId ??
    machine?.machine_id ??
    null
  );
}

function getMachineName(machine) {
  return (
    machine?.name ??
    machine?.machineName ??
    machine?.machine_name ??
    machine?.label ??
    null
  );
}

function getMachineSerial(machine) {
  return (
    machine?.serial_number ??
    machine?.serialNumber ??
    machine?.serial ??
    machine?.code ??
    machine?.identifier ??
    null
  );
}

//======================================================
// PAGE ALERTES
//======================================================

export default function Alerts({
  token,

  user,

  machines = [],

  machineId,
}) {
  //====================================================
  // DONNÉES MACHINE
  //====================================================

  const {
    machine,

    alerts,

    loading,

    error,

    reload,

    setAlerts,
  } = useMachineData(
    machineId,
    token
  );

  //====================================================
  // MACHINE SÉLECTIONNÉE
  //====================================================

  const safeMachines =
    Array.isArray(machines)
      ? machines
      : [];

  const selectedMachine =
    safeMachines.find(
      (item) =>
        String(
          getMachineId(item)
        ) ===
        String(machineId)
    ) ?? null;

  const displayMachineName =
    getMachineName(
      selectedMachine
    ) ??
    machine?.name ??
    "Machine";

  const displayMachineSerial =
    getMachineSerial(
      selectedMachine
    ) ??
    machine?.serial_number ??
    machine?.serialNumber ??
    "--";

  //====================================================
  // MACHINE EN LIGNE
  //====================================================

  const machineOnline =
    machine?.online === true ||
    String(
      machine?.status ??
        ""
    ).toLowerCase() ===
      "online";

  //====================================================
  // ALERTE ACQUITTÉE
  //====================================================

  function handleAcknowledged(
    alertId
  ) {
    setAlerts(
      (
        previousAlerts
      ) =>
        previousAlerts.filter(
          (alert) =>
            Number(
              alert.id ??
                alert.databaseId ??
                alert.database_id ??
                alert.alertId ??
                alert.alert_id
            ) !==
            Number(alertId)
        )
    );
  }

  //====================================================
  // AUCUNE MACHINE
  //====================================================

  if (!machineId) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-error">
          <strong>
            Aucune machine associée
          </strong>

          <p>
            Votre compte ne possède
            actuellement aucune machine.
          </p>
        </section>
      </main>
    );
  }

  //====================================================
  // AFFICHAGE
  //====================================================

  return (
    <main className="dashboard-page">
      {/* ==============================================
          EN-TÊTE
      ============================================== */}

      <header className="dashboard-machine-header">
        <div className="machine-selector">
          <span>
            Machine sélectionnée
          </span>

          <strong>
            {displayMachineName}
          </strong>
        </div>

        <div className="machine-identity">
          <span>
            ID Machine
          </span>

          <strong>
            {String(
              machineId
            ).padStart(
              3,
              "0"
            )}
          </strong>
        </div>

        <div className="machine-name">
          <span>
            Numéro de série
          </span>

          <strong>
            {displayMachineSerial}
          </strong>
        </div>

        <div className="machine-connection">
          <span>
            Statut
          </span>

          <strong
            className={
              machineOnline
                ? "machine-online"
                : "machine-offline"
            }
          >
            {machineOnline
              ? "● En ligne"
              : "● Hors ligne"}
          </strong>
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="refresh-button"
            onClick={
              reload
            }
            disabled={
              loading
            }
            title="Actualiser les alertes"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "icon-spinning"
                  : ""
              }
            />
          </button>
        </div>
      </header>

      {/* ==============================================
          TITRE
      ============================================== */}

      <section className="machine-summary machine-summary-warning">
        <div className="machine-summary-status">
          <div className="machine-summary-icon">
            <AlertTriangle
              size={28}
            />
          </div>

          <div>
            <span>
              Surveillance
            </span>

            <strong>
              Alertes de la machine
            </strong>
          </div>
        </div>

        <div className="machine-summary-metrics">
          <div>
            <span>
              Machine
            </span>

            <strong>
              {displayMachineName}
            </strong>
          </div>

          <div>
            <span>
              Alertes actives
            </span>

            <strong>
              {Array.isArray(
                alerts
              )
                ? alerts.length
                : 0}
            </strong>
          </div>
        </div>
      </section>

      {/* ==============================================
          CHARGEMENT
      ============================================== */}

      {loading && (
        <section className="dashboard-message">
          <Activity
            size={26}
          />

          <p>
            Chargement des alertes...
          </p>
        </section>
      )}

      {/* ==============================================
          ERREUR
      ============================================== */}

      {error && (
        <section className="dashboard-error">
          <strong>
            Erreur de chargement
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="retry-button"
            onClick={
              reload
            }
          >
            Réessayer
          </button>
        </section>
      )}

      {/* ==============================================
          ALERTES
      ============================================== */}

      {!error && (
        <AlertPanel
          alerts={
            alerts
          }

          token={
            token
          }

          user={
            user
          }

          onAcknowledged={
            handleAcknowledged
          }
        />
      )}
    </main>
  );
}
