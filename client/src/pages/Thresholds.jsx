import {
  Activity,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import ThresholdForm from "../components/ThresholdForm.jsx";

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
// FORMATAGE SEUIL
//======================================================

function getThresholdValue(
  threshold,
  camelCaseKey,
  snakeCaseKey
) {
  return (
    threshold?.[camelCaseKey] ??
    threshold?.[snakeCaseKey] ??
    null
  );
}

function getSourceLabel(source) {
  const labels = {
    L1: "Ligne 1",
    L2: "Ligne 2",
    L3: "Ligne 3",
    temperature: "Température",
    flow: "Débit",
    tank: "Réservoir",
  };

  return (
    labels[source] ??
    source ??
    "Source inconnue"
  );
}

function getParameterLabel(
  parameter
) {
  const labels = {
    voltage: "Tension",
    current: "Courant",
    power: "Puissance active",
    apparentPower:
      "Puissance apparente",
    apparent_power:
      "Puissance apparente",
    reactivePower:
      "Puissance réactive",
    reactive_power:
      "Puissance réactive",
    energy: "Énergie",
    frequency: "Fréquence",
    powerFactor:
      "Facteur de puissance",
    power_factor:
      "Facteur de puissance",
    temperature:
      "Température",
    flow:
      "Débit",
    levelPercent:
      "Niveau du réservoir",
    level_percent:
      "Niveau du réservoir",
    levelCm:
      "Hauteur de liquide",
    level_cm:
      "Hauteur de liquide",
    distanceCm:
      "Distance du capteur",
    distance_cm:
      "Distance du capteur",
    volumeLiters:
      "Volume disponible",
    volume_liters:
      "Volume disponible",
  };

  return (
    labels[parameter] ??
    parameter ??
    "Paramètre"
  );
}

function formatValue(
  value,
  unit
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  return `${value}${
    unit
      ? ` ${unit}`
      : ""
  }`;
}

//======================================================
// PAGE SEUILS
//======================================================

export default function Thresholds({
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

    thresholds,

    loading,

    error,

    reload,

    setThresholds,
  } = useMachineData(
    machineId,
    token
  );

  //====================================================
  // RÔLE
  //====================================================

  const userRole =
    String(
      user?.role ??
        "client"
    ).toLowerCase();

  const isManager =
    userRole ===
    "manager";

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

  const machineOnline =
    machine?.online === true ||
    String(
      machine?.status ??
        ""
    ).toLowerCase() ===
      "online";

  //====================================================
  // MANAGER : MISE À JOUR LOCALE APRÈS SAUVEGARDE
  //====================================================

  function handleSaved(
    savedThreshold
  ) {
    if (!savedThreshold) {
      return;
    }

    setThresholds(
      (
        previousThresholds
      ) => {
        const existing =
          previousThresholds.some(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                savedThreshold.id
              )
          );

        if (!existing) {
          return [
            ...previousThresholds,
            savedThreshold,
          ];
        }

        return previousThresholds.map(
          (item) =>
            Number(
              item.id
            ) ===
            Number(
              savedThreshold.id
            )
              ? {
                  ...item,
                  ...savedThreshold,
                }
              : item
        );
      }
    );
  }

  //====================================================
  // MANAGER : SUPPRESSION LOCALE
  //====================================================

  function handleDeleted(
    thresholdId
  ) {
    setThresholds(
      (
        previousThresholds
      ) =>
        previousThresholds.filter(
          (threshold) =>
            Number(
              threshold.id
            ) !==
            Number(
              thresholdId
            )
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
          EN-TÊTE MACHINE
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
            title="Actualiser les seuils"
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
          RÉSUMÉ
      ============================================== */}

      <section className="machine-summary">
        <div className="machine-summary-status">
          <div className="machine-summary-icon">
            <SlidersHorizontal
              size={28}
            />
          </div>

          <div>
            <span>
              Configuration
            </span>

            <strong>
              Seuils de surveillance
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
              Seuils configurés
            </span>

            <strong>
              {Array.isArray(
                thresholds
              )
                ? thresholds.length
                : 0}
            </strong>
          </div>

          <div>
            <span>
              Accès
            </span>

            <strong>
              {isManager
                ? "Modification"
                : "Consultation"}
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
            Chargement des seuils...
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
          MANAGER
      ============================================== */}

      {!error &&
        isManager && (
          <ThresholdForm
            machineId={
              machineId
            }

            token={
              token
            }

            thresholds={
              thresholds
            }

            onSaved={
              handleSaved
            }

            onDeleted={
              handleDeleted
            }
          />
        )}

      {/* ==============================================
          CLIENT : CONSULTATION SEULE
      ============================================== */}

      {!error &&
        !isManager && (
          <section className="threshold-panel">
            <div className="panel-header">
              <div>
                <span className="panel-eyebrow">
                  Consultation
                </span>

                <h2>
                  Seuils configurés
                </h2>

                <p className="threshold-description">
                  Ces seuils sont utilisés
                  pour détecter les anomalies
                  de la machine.
                </p>
              </div>

              <span className="threshold-count">
                {Array.isArray(
                  thresholds
                )
                  ? thresholds.length
                  : 0}
              </span>
            </div>

            {!Array.isArray(
              thresholds
            ) ||
            thresholds.length ===
              0 ? (
              <div className="threshold-empty-state">
                <p>
                  Aucun seuil configuré
                  pour cette machine.
                </p>
              </div>
            ) : (
              <div className="threshold-list">
                {thresholds.map(
                  (
                    threshold,
                    index
                  ) => {
                    const source =
                      threshold.source ??
                      "";

                    const parameter =
                      threshold.parameterName ??
                      threshold.parameter_name ??
                      "";

                    const unit =
                      threshold.unit ??
                      "";

                    const minimum =
                      getThresholdValue(
                        threshold,
                        "minimumValue",
                        "minimum_value"
                      );

                    const maximum =
                      getThresholdValue(
                        threshold,
                        "maximumValue",
                        "maximum_value"
                      );

                    const warning =
                      getThresholdValue(
                        threshold,
                        "warningValue",
                        "warning_value"
                      );

                    const critical =
                      getThresholdValue(
                        threshold,
                        "criticalValue",
                        "critical_value"
                      );

                    return (
                      <article
                        className="threshold-item"
                        key={
                          threshold.id ??
                          `${source}-${parameter}-${index}`
                        }
                      >
                        <div className="threshold-item-main">
                          <div className="threshold-item-title">
                            <strong>
                              {getSourceLabel(
                                source
                              )}
                            </strong>

                            <span>
                              {getParameterLabel(
                                parameter
                              )}
                            </span>
                          </div>

                          <div className="threshold-values">
                            <span>
                              <small>
                                Minimum
                              </small>

                              <strong>
                                {formatValue(
                                  minimum,
                                  unit
                                )}
                              </strong>
                            </span>

                            <span>
                              <small>
                                Maximum
                              </small>

                              <strong>
                                {formatValue(
                                  maximum,
                                  unit
                                )}
                              </strong>
                            </span>

                            <span>
                              <small>
                                Avertissement
                              </small>

                              <strong>
                                {formatValue(
                                  warning,
                                  unit
                                )}
                              </strong>
                            </span>

                            <span>
                              <small>
                                Critique
                              </small>

                              <strong>
                                {formatValue(
                                  critical,
                                  unit
                                )}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}
    </main>
  );
}
