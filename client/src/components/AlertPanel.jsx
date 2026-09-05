import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  Clock3,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  acknowledgeAlert,
} from "../services/api.js";

//======================================================
// LABELS
//======================================================

const LEVEL_LABELS = {
  critical: "Critique",
  warning: "Attention",
  normal: "Normal",
};

const PARAMETER_LABELS = {
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

const SOURCE_LABELS = {
  L1: "Ligne 1",
  L2: "Ligne 2",
  L3: "Ligne 3",

  temperature:
    "Température",

  flow:
    "Débit",

  tank:
    "Réservoir",
};

//======================================================
// DATE
//======================================================

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }

  return date.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

//======================================================
// ALERT ID
//======================================================

function getAlertId(alert) {
  return (
    alert?.id ??
    alert?.databaseId ??
    alert?.database_id ??
    alert?.alertId ??
    alert?.alert_id ??
    null
  );
}

//======================================================
// NIVEAU ALERTE
//======================================================

function getAlertLevel(alert) {
  const rawLevel =
    String(
      alert?.level ??
        alert?.severity ??
        alert?.status ??
        "warning"
    ).toLowerCase();

  if (
    rawLevel === "critical" ||
    rawLevel === "critique" ||
    rawLevel === "danger"
  ) {
    return "critical";
  }

  if (
    rawLevel === "normal" ||
    rawLevel === "ok"
  ) {
    return "normal";
  }

  return "warning";
}

//======================================================
// ICÔNE
//======================================================

function getAlertIcon(level) {
  if (
    level === "critical"
  ) {
    return AlertCircle;
  }

  return AlertTriangle;
}

//======================================================
// VALEURS
//======================================================

function getAlertValue(
  alert,
  camelCaseKey,
  snakeCaseKey,
  fallback = null
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

  const numericValue =
    Number(value);

  const formattedValue =
    Number.isFinite(
      numericValue
    )
      ? numericValue.toLocaleString(
          "fr-FR",
          {
            maximumFractionDigits:
              3,
          }
        )
      : String(value);

  return `${formattedValue}${
    unit
      ? ` ${unit}`
      : ""
  }`;
}

//======================================================
// LABEL SOURCE
//======================================================

function getSourceLabel(source) {
  return (
    SOURCE_LABELS[
      source
    ] ??
    source ??
    "Source inconnue"
  );
}

//======================================================
// LABEL PARAMÈTRE
//======================================================

function getParameterLabel(
  parameterName
) {
  if (!parameterName) {
    return "";
  }

  return (
    PARAMETER_LABELS[
      parameterName
    ] ??
    parameterName
  );
}

//======================================================
// ERREUR
//======================================================

function extractErrorMessage(
  error
) {
  return (
    error?.response?.data
      ?.message ??
    error?.response?.data
      ?.error ??
    error?.message ??
    "Impossible d’acquitter l’alerte."
  );
}

//======================================================
// COMPOSANT
//======================================================

export default function AlertPanel({
  alerts = [],

  token,

  user,

  onAcknowledged,
}) {
  //====================================================
  // RÔLE UTILISATEUR
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
  // FILTRE
  //====================================================

  const [
    filter,
    setFilter,
  ] = useState("all");

  //====================================================
  // ACQUITTEMENT
  //====================================================

  const [
    acknowledgingId,
    setAcknowledgingId,
  ] = useState(null);

  //====================================================
  // MESSAGE
  //====================================================

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState("");

  //====================================================
  // NORMALISATION ALERTES
  //====================================================

  const normalizedAlerts =
    useMemo(() => {
      if (
        !Array.isArray(
          alerts
        )
      ) {
        return [];
      }

      return alerts
        .map((alert) => {
          const level =
            getAlertLevel(
              alert
            );

          const createdAt =
            getAlertValue(
              alert,
              "createdAt",
              "created_at",
              alert?.timestamp ??
                alert?.date ??
                null
            );

          const source =
            alert?.source ??
            alert?.line ??
            alert?.sensor ??
            "Source inconnue";

          const parameterName =
            getAlertValue(
              alert,
              "parameterName",
              "parameter_name",
              alert?.parameter ??
                ""
            );

          const measuredValue =
            getAlertValue(
              alert,
              "measuredValue",
              "measured_value",
              alert?.value ??
                null
            );

          const thresholdValue =
            getAlertValue(
              alert,
              "thresholdValue",
              "threshold_value",
              alert?.limit ??
                alert?.threshold ??
                null
            );

          return {
            ...alert,

            id:
              getAlertId(
                alert
              ),

            level,

            createdAt,

            source,

            sourceLabel:
              getSourceLabel(
                source
              ),

            parameterName,

            parameterLabel:
              getParameterLabel(
                parameterName
              ),

            measuredValue,

            thresholdValue,

            unit:
              alert?.unit ??
              "",

            message:
              alert?.message ??
              alert?.description ??
              "Valeur anormale détectée.",
          };
        })

        .filter(
          (alert) =>
            alert.level !==
            "normal"
        )

        .sort(
          (
            first,
            second
          ) => {
            const firstTime =
              new Date(
                first.createdAt
              ).getTime();

            const secondTime =
              new Date(
                second.createdAt
              ).getTime();

            if (
              Number.isNaN(
                firstTime
              ) &&
              Number.isNaN(
                secondTime
              )
            ) {
              return 0;
            }

            if (
              Number.isNaN(
                firstTime
              )
            ) {
              return 1;
            }

            if (
              Number.isNaN(
                secondTime
              )
            ) {
              return -1;
            }

            return (
              secondTime -
              firstTime
            );
          }
        );
    }, [
      alerts,
    ]);

  //====================================================
  // FILTRAGE
  //====================================================

  const filteredAlerts =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return normalizedAlerts;
      }

      return normalizedAlerts.filter(
        (alert) =>
          alert.level ===
          filter
      );
    }, [
      normalizedAlerts,
      filter,
    ]);

  //====================================================
  // COMPTEURS
  //====================================================

  const criticalCount =
    useMemo(
      () =>
        normalizedAlerts.filter(
          (alert) =>
            alert.level ===
            "critical"
        ).length,
      [
        normalizedAlerts,
      ]
    );

  const warningCount =
    useMemo(
      () =>
        normalizedAlerts.filter(
          (alert) =>
            alert.level ===
            "warning"
        ).length,
      [
        normalizedAlerts,
      ]
    );

  //====================================================
  // MESSAGES
  //====================================================

  function showMessage(
    type,
    text
  ) {
    setMessageType(type);

    setMessage(text);
  }

  function clearMessage() {
    setMessage("");

    setMessageType("");
  }

  //====================================================
  // ACQUITTER UNE ALERTE
  //====================================================

  async function handleAcknowledge(
    alertId
  ) {
    if (!isManager) {
      showMessage(
        "error",
        "Seul un manager peut acquitter une alerte."
      );

      return;
    }

    if (!token) {
      showMessage(
        "error",
        "Session utilisateur invalide."
      );

      return;
    }

    if (
      alertId === null ||
      alertId === undefined ||
      alertId === ""
    ) {
      showMessage(
        "error",
        "Identifiant de l’alerte introuvable."
      );

      return;
    }

    try {
      setAcknowledgingId(
        alertId
      );

      clearMessage();

      await acknowledgeAlert(
        alertId,
        token
      );

      onAcknowledged?.(
        alertId
      );

      showMessage(
        "success",
        "Alerte acquittée avec succès."
      );
    } catch (error) {
      console.error(
        "Erreur lors de l’acquittement :",
        error
      );

      const status =
        error?.response?.status;

      if (
        status === 401
      ) {
        showMessage(
          "error",
          "Votre session n'est plus valide."
        );

        return;
      }

      if (
        status === 403
      ) {
        showMessage(
          "error",
          "Vous n'êtes pas autorisé à acquitter cette alerte."
        );

        return;
      }

      showMessage(
        "error",
        extractErrorMessage(
          error
        )
      );
    } finally {
      setAcknowledgingId(
        null
      );
    }
  }

  //====================================================
  // AFFICHAGE
  //====================================================

  return (
    <section className="alert-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">
            Surveillance
          </span>

          <h2>
            Alertes actives
          </h2>

          <p className="alert-panel-description">
            {isManager
              ? "Consulte et acquitte les anomalies actuellement détectées."
              : "Consulte les anomalies actuellement détectées."}
          </p>
        </div>

        <span className="alert-counter">
          {
            normalizedAlerts.length
          }
        </span>
      </div>

      {/* ==============================================
          FILTRES
      ============================================== */}

      <div className="alert-filters">
        <button
          className={
            filter === "all"
              ? "alert-filter active"
              : "alert-filter"
          }
          type="button"
          onClick={() =>
            setFilter(
              "all"
            )
          }
        >
          Toutes

          <span>
            {
              normalizedAlerts.length
            }
          </span>
        </button>

        <button
          className={
            filter ===
            "critical"
              ? "alert-filter active"
              : "alert-filter"
          }
          type="button"
          onClick={() =>
            setFilter(
              "critical"
            )
          }
        >
          Critiques

          <span>
            {
              criticalCount
            }
          </span>
        </button>

        <button
          className={
            filter ===
            "warning"
              ? "alert-filter active"
              : "alert-filter"
          }
          type="button"
          onClick={() =>
            setFilter(
              "warning"
            )
          }
        >
          Attention

          <span>
            {
              warningCount
            }
          </span>
        </button>
      </div>

      {/* ==============================================
          MESSAGE
      ============================================== */}

      {message ? (
        <p
          className={`alert-action-message alert-action-${messageType}`}
          role={
            messageType ===
            "error"
              ? "alert"
              : "status"
          }
        >
          {message}
        </p>
      ) : null}

      {/* ==============================================
          AUCUNE ALERTE
      ============================================== */}

      {normalizedAlerts.length ===
      0 ? (
        <div className="alert-empty-state">
          <CheckCircle2
            size={40}
          />

          <strong>
            Aucune alerte active
          </strong>

          <span>
            Toutes les mesures sont dans
            les seuils définis.
          </span>
        </div>
      ) : filteredAlerts.length ===
        0 ? (
        <div className="alert-empty-state">
          <CheckCircle2
            size={36}
          />

          <strong>
            Aucune alerte dans cette
            catégorie
          </strong>
        </div>
      ) : (
        <div className="alert-list">
          {filteredAlerts.map(
            (
              alert,
              index
            ) => {
              const AlertIcon =
                getAlertIcon(
                  alert.level
                );

              const isAcknowledging =
                String(
                  acknowledgingId
                ) ===
                String(
                  alert.id
                );

              return (
                <article
                  className={`alert-item alert-item-${alert.level}`}
                  key={
                    alert.id ??
                    `${alert.source}-${alert.createdAt}-${index}`
                  }
                >
                  <div className="alert-item-icon">
                    <AlertIcon
                      size={23}
                    />
                  </div>

                  <div className="alert-item-content">
                    <div className="alert-item-title">
                      <div>
                        <strong>
                          {
                            alert.sourceLabel
                          }
                        </strong>

                        {alert.parameterLabel ? (
                          <span className="alert-parameter">
                            {
                              alert.parameterLabel
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

                    <p>
                      {
                        alert.message
                      }
                    </p>

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
                        <Clock3
                          size={14}
                        />

                        {formatDate(
                          alert.createdAt
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ==================================
                      MANAGER UNIQUEMENT
                  ================================== */}

                  {isManager &&
                  alert.id !== null &&
                  alert.id !==
                    undefined ? (
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
