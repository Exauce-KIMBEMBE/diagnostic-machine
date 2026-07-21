import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  Clock3,
} from "lucide-react";

import { useMemo, useState } from "react";

import {
  acknowledgeAlert,
} from "../services/api.js";

const LEVEL_LABELS = {
  critical: "Critique",
  warning: "Attention",
  normal: "Normal",
};

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("fr-FR");
}

function getAlertId(alert) {
  return (
    alert?.id ??
    alert?.databaseId ??
    alert?.alertId ??
    null
  );
}

function getAlertLevel(alert) {
  const level =
    String(
      alert?.level ??
      alert?.severity ??
      "warning"
    ).toLowerCase();

  if (
    level === "critical" ||
    level === "warning"
  ) {
    return level;
  }

  return "warning";
}

function getAlertIcon(level) {
  if (level === "critical") {
    return AlertCircle;
  }

  return AlertTriangle;
}

function getAlertValue(
  alert,
  camelCaseKey,
  snakeCaseKey,
  fallback = "--"
) {
  return (
    alert?.[camelCaseKey] ??
    alert?.[snakeCaseKey] ??
    fallback
  );
}

function formatMeasurement(
  value,
  unit = ""
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  return `${value}${unit ? ` ${unit}` : ""}`;
}

export default function AlertPanel({
  alerts = [],
  onAcknowledged,
}) {
  const [filter, setFilter] =
    useState("all");

  const [acknowledgingId, setAcknowledgingId] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const normalizedAlerts = useMemo(() => {
    if (!Array.isArray(alerts)) {
      return [];
    }

    return alerts
      .map((alert) => {
        const level =
          getAlertLevel(alert);

        const createdAt =
          getAlertValue(
            alert,
            "createdAt",
            "created_at",
            alert?.timestamp
          );

        return {
          ...alert,
          id: getAlertId(alert),
          level,
          createdAt,

          source:
            alert?.source ??
            "Source inconnue",

          parameterName:
            getAlertValue(
              alert,
              "parameterName",
              "parameter_name",
              ""
            ),

          measuredValue:
            getAlertValue(
              alert,
              "measuredValue",
              "measured_value",
              alert?.value
            ),

          thresholdValue:
            getAlertValue(
              alert,
              "thresholdValue",
              "threshold_value",
              alert?.limit
            ),

          unit:
            alert?.unit ?? "",

          message:
            alert?.message ??
            "Valeur anormale détectée.",
        };
      })
      .sort((first, second) => {
        const firstTime =
          new Date(
            first.createdAt
          ).getTime();

        const secondTime =
          new Date(
            second.createdAt
          ).getTime();

        if (
          Number.isNaN(firstTime) ||
          Number.isNaN(secondTime)
        ) {
          return 0;
        }

        return secondTime - firstTime;
      });
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (filter === "all") {
      return normalizedAlerts;
    }

    return normalizedAlerts.filter(
      (alert) =>
        alert.level === filter
    );
  }, [normalizedAlerts, filter]);

  const criticalCount =
    normalizedAlerts.filter(
      (alert) =>
        alert.level === "critical"
    ).length;

  const warningCount =
    normalizedAlerts.filter(
      (alert) =>
        alert.level === "warning"
    ).length;

  function showMessage(type, text) {
    setMessageType(type);
    setMessage(text);
  }

  async function handleAcknowledge(alertId) {
    if (!alertId) {
      return;
    }

    try {
      setAcknowledgingId(alertId);
      setMessage("");
      setMessageType("");

      await acknowledgeAlert(alertId);

      onAcknowledged?.(alertId);

      showMessage(
        "success",
        "Alerte acquittée avec succès."
      );
    } catch (error) {
      console.error(
        "Erreur lors de l’acquittement :",
        error
      );

      showMessage(
        "error",
        error.response?.data?.message ||
          error.message ||
          "Impossible d’acquitter l’alerte."
      );
    } finally {
      setAcknowledgingId(null);
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

          <p className="alert-panel-description">
            Consulte et acquitte les
            anomalies actuellement détectées.
          </p>
        </div>

        <span className="alert-counter">
          {normalizedAlerts.length}
        </span>
      </div>

      <div className="alert-filters">
        <button
          className={
            filter === "all"
              ? "alert-filter active"
              : "alert-filter"
          }
          type="button"
          onClick={() =>
            setFilter("all")
          }
        >
          Toutes
          <span>
            {normalizedAlerts.length}
          </span>
        </button>

        <button
          className={
            filter === "critical"
              ? "alert-filter active"
              : "alert-filter"
          }
          type="button"
          onClick={() =>
            setFilter("critical")
          }
        >
          Critiques
          <span>{criticalCount}</span>
        </button>

        <button
          className={
            filter === "warning"
              ? "alert-filter active"
              : "alert-filter"
          }
          type="button"
          onClick={() =>
            setFilter("warning")
          }
        >
          Attention
          <span>{warningCount}</span>
        </button>
      </div>

      {message ? (
        <p
          className={`alert-action-message alert-action-${messageType}`}
        >
          {message}
        </p>
      ) : null}

      {normalizedAlerts.length === 0 ? (
        <div className="alert-empty-state">
          <CheckCircle2 size={40} />

          <strong>
            Aucune alerte active
          </strong>

          <span>
            Toutes les mesures sont dans
            les seuils définis.
          </span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="alert-empty-state">
          <CheckCircle2 size={36} />

          <strong>
            Aucune alerte dans cette catégorie
          </strong>
        </div>
      ) : (
        <div className="alert-list">
          {filteredAlerts.map(
            (alert, index) => {
              const AlertIcon =
                getAlertIcon(
                  alert.level
                );

              const isAcknowledging =
                Number(
                  acknowledgingId
                ) === Number(alert.id);

              return (
                <article
                  className={`alert-item alert-item-${alert.level}`}
                  key={
                    alert.id ??
                    `${alert.source}-${alert.createdAt}-${index}`
                  }
                >
                  <div className="alert-item-icon">
                    <AlertIcon size={23} />
                  </div>

                  <div className="alert-item-content">
                    <div className="alert-item-title">
                      <div>
                        <strong>
                          {alert.source}
                        </strong>

                        {alert.parameterName ? (
                          <span className="alert-parameter">
                            {
                              alert.parameterName
                            }
                          </span>
                        ) : null}
                      </div>

                      <span
                        className={`alert-level alert-level-${alert.level}`}
                      >
                        {
                          LEVEL_LABELS[
                            alert.level
                          ]
                        }
                      </span>
                    </div>

                    <p>{alert.message}</p>

                    <div className="alert-item-details">
                      <span>
                        Valeur mesurée :
                        <strong>
                          {" "}
                          {formatMeasurement(
                            alert.measuredValue,
                            alert.unit
                          )}
                        </strong>
                      </span>

                      <span>
                        Seuil :
                        <strong>
                          {" "}
                          {formatMeasurement(
                            alert.thresholdValue,
                            alert.unit
                          )}
                        </strong>
                      </span>

                      <span>
                        <Clock3 size={14} />
                        {formatDate(
                          alert.createdAt
                        )}
                      </span>
                    </div>
                  </div>

                  {alert.id ? (
                    <button
                      className="acknowledge-button"
                      type="button"
                      onClick={() =>
                        handleAcknowledge(
                          alert.id
                        )
                      }
                      disabled={
                        isAcknowledging
                      }
                    >
                      <CheckCheck
                        size={17}
                      />

                      {isAcknowledging
                        ? "Acquittement..."
                        : "Acquitter"}
                    </button>
                  ) : null}
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
