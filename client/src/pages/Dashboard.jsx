import { useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Download,
  Droplets,
  Gauge,
  Image,
  RefreshCw,
  Settings,
  Sheet,
  Thermometer,
} from "lucide-react";

import LineCard from "../components/LineCard.jsx";
import SensorCard from "../components/SensorCard.jsx";
import PowerChart from "../components/PowerChart.jsx";

import { useMachineData } from "../hooks/useMachineData.js";

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatPower(value) {
  const power = toNumber(value);

  if (Math.abs(power) >= 1000) {
    return `${(power / 1000).toFixed(2)} kW`;
  }

  return `${power.toFixed(1)} W`;
}

function formatDate(value) {
  if (!value) {
    return "Aucune donnée";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return date.toLocaleString("fr-FR");
}

function getAlertLevel(alert) {
  return String(
    alert?.level ??
      alert?.severity ??
      "warning"
  ).toLowerCase();
}

function getGlobalStatus({
  machineOnline,
  alerts,
  lines,
  temperature,
  flow,
  tank,
}) {
  if (!machineOnline) {
    return "offline";
  }

  const hasCriticalAlert = alerts.some(
    (alert) =>
      getAlertLevel(alert) ===
      "critical"
  );

  if (hasCriticalAlert) {
    return "critical";
  }

  const statuses = [
    lines?.L1?.status,
    lines?.L2?.status,
    lines?.L3?.status,
    temperature?.status,
    flow?.status,
    tank?.status,
  ];

  if (
    statuses.some(
      (status) =>
        status === "critical"
    )
  ) {
    return "critical";
  }

  const hasWarningAlert = alerts.some(
    (alert) =>
      getAlertLevel(alert) ===
      "warning"
  );

  if (
    hasWarningAlert ||
    statuses.some(
      (status) =>
        status === "warning"
    )
  ) {
    return "warning";
  }

  return "normal";
}

const globalStatusLabels = {
  normal: "Machine normale",
  warning: "Attention requise",
  critical: "Anomalie critique",
  offline: "Machine hors ligne",
};

const availableMetrics = [
  {
    id: "power",
    label: "Puissance",
    unit: "kW",
  },
  {
    id: "current",
    label: "Courant",
    unit: "A",
  },
  {
    id: "voltage",
    label: "Tension",
    unit: "V",
  },
  {
    id: "energy",
    label: "Énergie",
    unit: "kWh",
  },
  {
    id: "temperature",
    label: "Température",
    unit: "°C",
  },
  {
    id: "flow",
    label: "Débit",
    unit: "L/min",
  },
  {
    id: "tank",
    label: "Niveau réservoir",
    unit: "%",
  },
  {
    id: "powerFactor",
    label: "Facteur de puissance",
    unit: "",
  },
  {
    id: "frequency",
    label: "Fréquence",
    unit: "Hz",
  },
  {
    id: "cost",
    label: "Coût",
    unit: "€",
  },
];

const periods = [
  {
    id: "realtime",
    label: "Temps réel",
  },
  {
    id: "1h",
    label: "1 h",
  },
  {
    id: "24h",
    label: "24 h",
  },
  {
    id: "7d",
    label: "7 j",
  },
  {
    id: "30d",
    label: "30 j",
  },
];

const chartTypes = [
  {
    id: "line",
    label: "Courbe",
  },
  {
    id: "bar",
    label: "Barres",
  },
  {
    id: "area",
    label: "Aires",
  },
  {
    id: "pie",
    label: "Camembert",
  },
];

export default function Dashboard({
  onOpenSettings,
}) {
  const {
    machine,
    history,
    alerts,
    period,
    setPeriod,
    loading,
    error,
    reload,
  } = useMachineData(1);

  const [
    selectedLines,
    setSelectedLines,
  ] = useState([
    "L1",
    "L2",
    "L3",
  ]);

  const [
    selectedMetrics,
    setSelectedMetrics,
  ] = useState([
    "power",
  ]);

  const [
    chartType,
    setChartType,
  ] = useState("line");

  const lines =
    machine?.lines ?? {};

  const temperature =
    machine?.temperature ?? {};

  const flow =
    machine?.flow ?? {};

  const tank =
    machine?.tank ?? {};

  const machineOnline =
    machine?.online === true ||
    String(
      machine?.status ?? ""
    ).toLowerCase() === "online";

  const line1Power =
    toNumber(
      lines?.L1?.power
    );

  const line2Power =
    toNumber(
      lines?.L2?.power
    );

  const line3Power =
    toNumber(
      lines?.L3?.power
    );

  const totalPower =
    line1Power +
    line2Power +
    line3Power;

  const safeAlerts =
    Array.isArray(alerts)
      ? alerts
      : [];

  const globalStatus =
    getGlobalStatus({
      machineOnline,
      alerts: safeAlerts,
      lines,
      temperature,
      flow,
      tank,
    });

  function toggleLine(lineId) {
    setSelectedLines(
      (currentLines) => {
        const isSelected =
          currentLines.includes(
            lineId
          );

        if (
          isSelected &&
          currentLines.length === 1
        ) {
          return currentLines;
        }

        if (isSelected) {
          return currentLines.filter(
            (currentLine) =>
              currentLine !==
              lineId
          );
        }

        return [
          ...currentLines,
          lineId,
        ];
      }
    );
  }

  function toggleMetric(
    metricId
  ) {
    setSelectedMetrics(
      (currentMetrics) => {
        const isSelected =
          currentMetrics.includes(
            metricId
          );

        if (
          isSelected &&
          currentMetrics.length === 1
        ) {
          return currentMetrics;
        }

        if (isSelected) {
          return currentMetrics.filter(
            (currentMetric) =>
              currentMetric !==
              metricId
          );
        }

        return [
          ...currentMetrics,
          metricId,
        ];
      }
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-machine-header">
        <div className="machine-selector">
          <span>
            Machine sélectionnée
          </span>

          <strong>
            {machine?.name ??
              "Atelier de production"}
          </strong>
        </div>

        <div className="machine-identity">
          <span>
            ID Machine
          </span>

          <strong>
            {machine?.id
              ? String(
                  machine.id
                ).padStart(
                  3,
                  "0"
                )
              : "001"}
          </strong>
        </div>

        <div className="machine-name">
          <span>
            Nom de la machine
          </span>

          <strong>
            {machine?.name ??
              "Atelier de production"}
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
            onClick={reload}
            disabled={loading}
            title="Actualiser les données"
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

          <button
            type="button"
            className="settings-button"
            onClick={
              onOpenSettings
            }
            title="Ouvrir les paramètres"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {loading && (
        <section className="dashboard-message">
          <Activity size={26} />

          <p>
            Chargement des données...
          </p>
        </section>
      )}

      {error && (
        <section className="dashboard-error">
          <strong>
            Erreur de chargement
          </strong>

          <p>{error}</p>

          <button
            type="button"
            className="retry-button"
            onClick={reload}
          >
            Réessayer
          </button>
        </section>
      )}

      <div className="dashboard-workspace">
        <div className="dashboard-main-content">
          <section
            className={`machine-summary machine-summary-${globalStatus}`}
          >
            <div className="machine-summary-status">
              <div className="machine-summary-icon">
                {globalStatus ===
                "critical" ? (
                  <AlertTriangle
                    size={28}
                  />
                ) : (
                  <Activity
                    size={28}
                  />
                )}
              </div>

              <div>
                <span>
                  État général
                </span>

                <strong>
                  {
                    globalStatusLabels[
                      globalStatus
                    ]
                  }
                </strong>
              </div>
            </div>

            <div className="machine-summary-metrics">
              <div>
                <span>
                  Puissance totale
                </span>

                <strong>
                  {formatPower(
                    totalPower
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Température
                </span>

                <strong>
                  {toNumber(
                    temperature.value
                  ).toFixed(1)}{" "}
                  °C
                </strong>
              </div>

              <div>
                <span>
                  Débit
                </span>

                <strong>
                  {toNumber(
                    flow.value
                  ).toFixed(2)}{" "}
                  L/min
                </strong>
              </div>

              <div>
                <span>
                  Réservoir
                </span>

                <strong>
                  {toNumber(
                    tank.levelPercent
                  ).toFixed(1)}{" "}
                  %
                </strong>
              </div>
            </div>
          </section>

          <section className="lines-grid">
            <div className="line-wrapper line-wrapper-1">
              <LineCard
                title="Ligne 1"
                data={
                  lines.L1
                }
                lineId="L1"
              />
            </div>

            <div className="line-wrapper line-wrapper-2">
              <LineCard
                title="Ligne 2"
                data={
                  lines.L2
                }
                lineId="L2"
              />
            </div>

            <div className="line-wrapper line-wrapper-3">
              <LineCard
                title="Ligne 3"
                data={
                  lines.L3
                }
                lineId="L3"
              />
            </div>
          </section>

          <section className="sensors-grid">
            <SensorCard
              title="Température"
              value={
                temperature.value
              }
              unit="°C"
              status={
                temperature.status ??
                "offline"
              }
              icon={Thermometer}
              digits={1}
            />

            <SensorCard
              title="Débit"
              value={
                flow.value
              }
              unit="L/min"
              status={
                flow.status ??
                "offline"
              }
              icon={Droplets}
              digits={2}
            />

            <SensorCard
              title="Niveau du réservoir"
              value={
                tank.levelPercent
              }
              unit="%"
              status={
                tank.status ??
                "offline"
              }
              icon={Gauge}
              digits={1}
            />

            <SensorCard
              title="Volume disponible"
              value={
                tank.volumeLiters
              }
              unit="L"
              status={
                tank.status ??
                "offline"
              }
              icon={Droplets}
              digits={1}
            />

            <SensorCard
              title="Distance capteur"
              value={
                tank.distanceCm
              }
              unit="cm"
              status={
                tank.status ??
                "offline"
              }
              icon={Gauge}
              digits={1}
            />

            <article className="last-update-card">
              <span>
                Dernière mise à jour
              </span>

              <strong>
                {formatDate(
                  machine?.timestamp ??
                    machine?.updatedAt ??
                    machine?.updated_at
                )}
              </strong>
            </article>
          </section>

          <section className="power-summary">
            <div className="panel-header">
              <div>
                <span className="panel-eyebrow">
                  Consommation
                </span>

                <h2>
                  Répartition de la puissance
                </h2>
              </div>

              <strong className="power-summary-total">
                Total :{" "}
                {formatPower(
                  totalPower
                )}
              </strong>
            </div>

            <div className="power-summary-grid">
              <article className="power-line power-line-1">
                <span>
                  Ligne 1
                </span>

                <strong>
                  {formatPower(
                    line1Power
                  )}
                </strong>
              </article>

              <article className="power-line power-line-2">
                <span>
                  Ligne 2
                </span>

                <strong>
                  {formatPower(
                    line2Power
                  )}
                </strong>
              </article>

              <article className="power-line power-line-3">
                <span>
                  Ligne 3
                </span>

                <strong>
                  {formatPower(
                    line3Power
                  )}
                </strong>
              </article>

              <article className="power-line power-line-total">
                <span>
                  Total
                </span>

                <strong>
                  {formatPower(
                    totalPower
                  )}
                </strong>
              </article>
            </div>
          </section>
        </div>

               <aside className="analysis-panel">
          <div className="analysis-panel-header">
            <div>
              <span>
                Supervision
              </span>

              <h2>
                Analyse & Graphiques
              </h2>
            </div>

            <BarChart3 size={22} />
          </div>

          <section className="analysis-section">
            <div className="analysis-date-selector">
              <CalendarDays
                size={17}
              />

              <select
                value={period}
                onChange={(
                  event
                ) =>
                  setPeriod(
                    event.target
                      .value
                  )
                }
              >
                <option value="realtime">
                  Aujourd’hui
                </option>

                <option value="1h">
                  Dernière heure
                </option>

                <option value="24h">
                  Dernières 24 heures
                </option>

                <option value="7d">
                  7 derniers jours
                </option>

                <option value="30d">
                  30 derniers jours
                </option>
              </select>
            </div>

            <div className="period-buttons">
              {periods.map(
                (
                  periodOption
                ) => (
                  <button
                    key={
                      periodOption.id
                    }
                    type="button"
                    className={
                      period ===
                      periodOption.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setPeriod(
                        periodOption.id
                      )
                    }
                  >
                    {
                      periodOption.label
                    }
                  </button>
                )
              )}
            </div>
          </section>

          <section className="analysis-section">
            <h3>
              Sélection des lignes
            </h3>

            <div className="analysis-lines">
              {[
                "L1",
                "L2",
                "L3",
              ].map(
                (lineId) => (
                  <label
                    key={
                      lineId
                    }
                    className={`analysis-checkbox analysis-checkbox-${lineId.toLowerCase()}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLines.includes(
                        lineId
                      )}
                      onChange={() =>
                        toggleLine(
                          lineId
                        )
                      }
                    />

                    <span>
                      Ligne{" "}
                      {lineId.replace(
                        "L",
                        ""
                      )}
                    </span>
                  </label>
                )
              )}
            </div>
          </section>

          <section className="analysis-section">
            <h3>
              Paramètres
            </h3>

            <div className="metrics-selector">
              {availableMetrics.map(
                (metric) => (
                  <label
                    key={
                      metric.id
                    }
                    className="analysis-checkbox"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(
                        metric.id
                      )}
                      onChange={() =>
                        toggleMetric(
                          metric.id
                        )
                      }
                    />

                    <span>
                      {
                        metric.label
                      }

                      {metric.unit
                        ? ` (${metric.unit})`
                        : ""}
                    </span>
                  </label>
                )
              )}
            </div>
          </section>

          <section className="analysis-section">
            <h3>
              Type de graphique
            </h3>

            <div className="chart-type-buttons">
              {chartTypes.map(
                (type) => (
                  <button
                    key={
                      type.id
                    }
                    type="button"
                    className={
                      chartType ===
                      type.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setChartType(
                        type.id
                      )
                    }
                  >
                    {
                      type.label
                    }
                  </button>
                )
              )}
            </div>
          </section>

          <section className="analysis-chart-container">
            <PowerChart
              history={history}
              period={period}
              onPeriodChange={
                setPeriod
              }
              selectedLines={
                selectedLines
              }
              selectedMetrics={
                selectedMetrics
              }
              chartType={
                chartType
              }
            />
          </section>

          <section className="analysis-line-results">
            <article className="analysis-result result-line-1">
              <span>
                Ligne 1
              </span>

              <strong>
                {formatPower(
                  line1Power
                )}
              </strong>
            </article>

            <article className="analysis-result result-line-2">
              <span>
                Ligne 2
              </span>

              <strong>
                {formatPower(
                  line2Power
                )}
              </strong>
            </article>

            <article className="analysis-result result-line-3">
              <span>
                Ligne 3
              </span>

              <strong>
                {formatPower(
                  line3Power
                )}
              </strong>
            </article>
          </section>

          <section className="analysis-export">
            <h3>
              Exporter les données
            </h3>

            <div className="export-buttons">
              <button
                type="button"
              >
                <Download
                  size={16}
                />
                PDF
              </button>

              <button
                type="button"
              >
                <Sheet
                  size={16}
                />
                Excel
              </button>

              <button
                type="button"
              >
                <Download
                  size={16}
                />
                CSV
              </button>

              <button
                type="button"
              >
                <Image
                  size={16}
                />
                Image
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
} 
