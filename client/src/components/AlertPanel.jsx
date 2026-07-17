import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { acknowledgeAlert } from "../services/api.js";

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString("fr-FR");
}

export default function AlertPanel({
  alerts = [],
  onAcknowledged,
}) {
  async function handleAcknowledge(alertId) {
    try {
      await acknowledgeAlert(alertId);

      if (onAcknowledged) {
        onAcknowledged(alertId);
      }
    } catch (error) {
      console.error(
        "Erreur lors de l’acquittement :",
        error
      );
    }
  }

  return (
    <section className="alert-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">
            Surveillance
          </span>

          <h2>Alertes actives</h2>
        </div>

        <span className="alert-counter">
          {alerts.length}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="alert-empty-state">
          <CheckCircle2 size={36} />

          <strong>Aucune alerte active</strong>

          <span>
            Toutes les mesures sont dans les seuils définis.
          </span>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map((alert) => {
            const alertId =
              alert.id ?? alert.databaseId;

            const level =
              alert.level || "warning";

            const measuredValue =
              alert.measured_value ??
              alert.value ??
              "--";

            const thresholdValue =
              alert.threshold_value ??
              alert.limit ??
              "--";

            const createdAt =
              alert.created_at ??
              alert.timestamp;

            return (
              <article
                className={`alert-item alert-item-${level}`}
                key={
                  alertId ??
                  `${alert.source}-${createdAt}`
                }
              >
                <div className="alert-item-icon">
                  <AlertTriangle size={22} />
                </div>

                <div className="alert-item-content">
                  <div className="alert-item-title">
                    <strong>
                      {alert.source}
                    </strong>

                    <span
                      className={`alert-level alert-level-${level}`}
                    >
                      {level === "critical"
                        ? "Critique"
                        : "Attention"}
                    </span>
                  </div>

                  <p>{alert.message}</p>

                  <div className="alert-item-details">
                    <span>
                      Valeur : {measuredValue}
                    </span>

                    <span>
                      Seuil : {thresholdValue}
                    </span>

                    <span>
                      <Clock3 size={14} />
                      {formatDate(createdAt)}
                    </span>
                  </div>
                </div>

                {alertId ? (
                  <button
                    className="acknowledge-button"
                    type="button"
                    onClick={() =>
                      handleAcknowledge(alertId)
                    }
                  >
                    Acquitter
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}