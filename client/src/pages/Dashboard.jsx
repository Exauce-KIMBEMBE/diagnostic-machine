import {
  Activity,
  AlertTriangle,
  Droplets,
  Gauge,
  RefreshCw,
  Server,
  Settings,
  Thermometer,
  Zap,
} from "lucide-react";

import LineCard from "../components/LineCard.jsx";
import SensorCard from "../components/SensorCard.jsx";
import AlertPanel from "../components/AlertPanel.jsx";
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
  socketConnected,
  alerts,
  lines,
  temperature,
  flow,
  tank,
}) {
  if (!socketConnected) {
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

export default function Dashboard({
  onOpenSettings,
}) {
  const {
    machine,
    history,
    alerts,
    period,
    setPeriod,
    socketConnected,
    loading,
    error,
    reload,
    setAlerts,
  } = useMachineData(1);

  const lines = machine?.lines ?? {};
  const temperature =
    machine?.temperature ?? {};
  const flow = machine?.flow ?? {};
  const tank = machine?.tank ?? {};

  const line1Power = toNumber(
    lines?.L1?.power
  );

  const line2Power = toNumber(
    lines?.L2?.power
  );

  const line3Power = toNumber(
    lines?.L3?.power
  );

  const totalPower =
    line1Power +
    line2Power +
    line3Power;

  const criticalAlerts =
    Array.isArray(alerts)
      ? alerts.filter(
          (alert) =>
            getAlertLevel(alert) ===
            "critical"
        ).length
      : 0;

  const warningAlerts =
    Array.isArray(alerts)
      ? alerts.filter(
          (alert) =>
            getAlertLevel(alert) ===
            "warning"
        ).length
      : 0;

  const globalStatus =
    getGlobalStatus({
      socketConnected,
      alerts:
        Array.isArray(alerts)
          ? alerts
          : [],
      lines,
      temperature,
      flow,
      tank,
    });

  function handleAlertAcknowledged(
    alertId
  ) {
    setAlerts((previousAlerts) =>
      previousAlerts.filter(
        (alert) =>
          Number(
            alert.id ??
              alert.databaseId ??
              alert.alertId
          ) !== Number(alertId)
      )
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">
            Supervision industrielle
          </span>

          <h1>Diagnostic machine</h1>

          <p>
            Suivi des trois lignes
            électriques, de la
            température, du débit et du
            niveau du réservoir.
          </p>
        </div>

        <div className="dashboard-actions">
          <div
            className={
              socketConnected
                ? "connection-status connected"
                : "connection-status disconnected"
            }
          >
            <Server size={18} />

            <span>
              {socketConnected
                ? "Temps réel connecté"
                : "Temps réel déconnecté"}
            </span>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "icon-spinning"
                  : ""
              }
            />

            {loading
              ? "Actualisation..."
              : "Actualiser"}
          </button>

          <button
            className="settings-button"
            type="button"
            onClick={onOpenSettings}
          >
            <Settings size={18} />
            Paramètres
          </button>
        </div>
      </header>

      {loading ? (
        <section className="dashboard-message">
          <Activity size={28} />

          <p>
            Chargement des données...
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="dashboard-error">
          <strong>Erreur</strong>

          <p>{error}</p>

          <button
            className="retry-button"
            type="button"
            onClick={reload}
          >
            Réessayer
          </button>
        </section>
      ) : null}

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
              <Activity size={28} />
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
              {formatPower(totalPower)}
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
            <span>Débit</span>

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

      <section className="dashboard-indicators">
        <article className="indicator-card">
          <div className="indicator-icon">
            <Zap size={22} />
          </div>

          <div>
            <span>
              Puissance totale
            </span>

            <strong>
              {formatPower(totalPower)}
            </strong>
          </div>
        </article>

        <article className="indicator-card indicator-critical">
          <div className="indicator-icon">
            <AlertTriangle
              size={22}
            />
          </div>

          <div>
            <span>
              Alertes critiques
            </span>

            <strong>
              {criticalAlerts}
            </strong>
          </div>
        </article>

        <article className="indicator-card indicator-warning">
          <div className="indicator-icon">
            <AlertTriangle
              size={22}
            />
          </div>

          <div>
            <span>
              Avertissements
            </span>

            <strong>
              {warningAlerts}
            </strong>
          </div>
        </article>

        <article className="indicator-card">
          <div className="indicator-icon">
            <Gauge size={22} />
          </div>

          <div>
            <span>
              Niveau réservoir
            </span>

            <strong>
              {toNumber(
                tank.levelPercent
              ).toFixed(1)}{" "}
              %
            </strong>
          </div>
        </article>
      </section>

      <section className="lines-grid">
        <LineCard
          title="Ligne 1"
          data={lines.L1}
        />

        <LineCard
          title="Ligne 2"
          data={lines.L2}
        />

        <LineCard
          title="Ligne 3"
          data={lines.L3}
        />
      </section>

      <section className="sensors-grid">
        <SensorCard
          title="Température"
          value={temperature.value}
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
          value={flow.value}
          unit="L/min"
          status={
            flow.status ?? "offline"
          }
          icon={Droplets}
          digits={2}
        />

        <SensorCard
          title="Niveau du réservoir"
          value={tank.levelPercent}
          unit="%"
          status={
            tank.status ?? "offline"
          }
          icon={Gauge}
          digits={1}
        />

        <SensorCard
          title="Volume disponible"
          value={tank.volumeLiters}
          unit="L"
          status={
            tank.status ?? "offline"
          }
          icon={Droplets}
          digits={1}
        />

        <SensorCard
          title="Distance capteur"
          value={tank.distanceCm}
          unit="cm"
          status={
            tank.status ?? "offline"
          }
          icon={Gauge}
          digits={1}
        />

        <article className="last-update-card">
          <span className="last-update-label">
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
            {formatPower(totalPower)}
          </strong>
        </div>

        <div className="power-summary-grid">
          <div>
            <span>Ligne 1</span>

            <strong>
              {formatPower(
                line1Power
              )}
            </strong>
          </div>

          <div>
            <span>Ligne 2</span>

            <strong>
              {formatPower(
                line2Power
              )}
            </strong>
          </div>

          <div>
            <span>Ligne 3</span>

            <strong>
              {formatPower(
                line3Power
              )}
            </strong>
          </div>
        </div>
      </section>

      <PowerChart
        history={history}
        period={period}
        onPeriodChange={setPeriod}
      />

      <AlertPanel
        alerts={
          Array.isArray(alerts)
            ? alerts
            : []
        }
        onAcknowledged={
          handleAlertAcknowledged
        }
      />
    </main>
  );
}
