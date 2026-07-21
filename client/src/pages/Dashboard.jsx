import {
  Activity,
  Droplets,
  Gauge,
  RefreshCw,
  Server,
  Settings,
  Thermometer,
} from "lucide-react";

import LineCard from "../components/LineCard.jsx";
import SensorCard from "../components/SensorCard.jsx";
import AlertPanel from "../components/AlertPanel.jsx";
import PowerChart from "../components/PowerChart.jsx";

import { useMachineData } from "../hooks/useMachineData.js";

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

  function handleAlertAcknowledged(
    alertId
  ) {
    setAlerts((previousAlerts) =>
      previousAlerts.filter(
        (alert) =>
          Number(
            alert.id ??
              alert.databaseId
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
        </section>
      ) : null}

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
          value={temperature.value ?? 0}
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
          value={flow.value ?? 0}
          unit="L/min"
          status={
            flow.status ?? "offline"
          }
          icon={Droplets}
          digits={2}
        />

        <SensorCard
          title="Niveau du réservoir"
          value={tank.levelPercent ?? 0}
          unit="%"
          status={
            tank.status ?? "offline"
          }
          icon={Gauge}
          digits={1}
        />

        <SensorCard
          title="Volume disponible"
          value={tank.volumeLiters ?? 0}
          unit="L"
          status={
            tank.status ?? "offline"
          }
          icon={Droplets}
          digits={1}
        />

        <SensorCard
          title="Distance capteur"
          value={tank.distanceCm ?? 0}
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
            {machine?.timestamp
              ? new Date(
                  machine.timestamp
                ).toLocaleString("fr-FR")
              : "Aucune donnée"}
          </strong>
        </article>
      </section>

      <PowerChart
        history={history}
        period={period}
        onPeriodChange={setPeriod}
      />

      <AlertPanel
        alerts={alerts}
        onAcknowledged={
          handleAlertAcknowledged
        }
      />
    </main>
  );
}
