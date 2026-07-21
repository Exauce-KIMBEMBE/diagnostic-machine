import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  RefreshCw,
  Settings2,
} from "lucide-react";

import ThresholdForm from "../components/ThresholdForm.jsx";

import {
  getThresholds,
} from "../services/api.js";

const MACHINE_ID = 1;

function extractArray(response) {
  const data =
    response?.data?.data ??
    response?.data ??
    response;

  return Array.isArray(data)
    ? data
    : [];
}

function normalizeThreshold(threshold) {
  if (!threshold) {
    return null;
  }

  return {
    ...threshold,

    id:
      threshold.id ??
      threshold.thresholdId,

    machineId:
      Number(
        threshold.machineId ??
          threshold.machine_id ??
          MACHINE_ID
      ) || MACHINE_ID,

    source:
      threshold.source ?? "",

    parameterName:
      threshold.parameterName ??
      threshold.parameter_name ??
      "",

    minimumValue:
      threshold.minimumValue ??
      threshold.minimum_value ??
      null,

    maximumValue:
      threshold.maximumValue ??
      threshold.maximum_value ??
      null,

    warningValue:
      threshold.warningValue ??
      threshold.warning_value ??
      null,

    criticalValue:
      threshold.criticalValue ??
      threshold.critical_value ??
      null,

    unit:
      threshold.unit ?? "",
  };
}

export default function Settings({
  onBack,
}) {
  const [thresholds, setThresholds] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadThresholds = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getThresholds(MACHINE_ID);

        const receivedThresholds =
          extractArray(response)
            .map(normalizeThreshold)
            .filter(Boolean);

        setThresholds(
          receivedThresholds
        );
      } catch (requestError) {
        console.error(
          "Erreur chargement des seuils :",
          requestError
        );

        setError(
          requestError.response?.data
            ?.message ||
            requestError.message ||
            "Impossible de charger les seuils"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadThresholds();
  }, [loadThresholds]);

  function handleSaved(
    savedThresholdResponse
  ) {
    const savedThreshold =
      normalizeThreshold(
        savedThresholdResponse?.data
          ?.data ??
          savedThresholdResponse?.data ??
          savedThresholdResponse
      );

    if (!savedThreshold) {
      return;
    }

    setThresholds(
      (previousThresholds) => {
        const existingIndex =
          previousThresholds.findIndex(
            (item) =>
              Number(item.id) ===
              Number(savedThreshold.id)
          );

        if (existingIndex === -1) {
          return [
            ...previousThresholds,
            savedThreshold,
          ];
        }

        return previousThresholds.map(
          (item) =>
            Number(item.id) ===
            Number(savedThreshold.id)
              ? {
                  ...item,
                  ...savedThreshold,
                }
              : item
        );
      }
    );
  }

  function handleDeleted(
    thresholdId
  ) {
    setThresholds(
      (previousThresholds) =>
        previousThresholds.filter(
          (item) =>
            Number(item.id) !==
            Number(thresholdId)
        )
    );
  }

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <span className="dashboard-eyebrow">
            Configuration
          </span>

          <h1>
            <Settings2 size={32} />
            Paramètres
          </h1>

          <p>
            Définis les seuils minimaux,
            maximaux, d’avertissement et
            critiques de la machine.
          </p>
        </div>

        <div className="settings-actions">
          <button
            className="refresh-button"
            type="button"
            onClick={loadThresholds}
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
              ? "Chargement..."
              : "Actualiser"}
          </button>

          <button
            className="back-button"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>
        </div>
      </header>

      {loading ? (
        <section className="dashboard-message">
          Chargement des seuils...
        </section>
      ) : null}

      {error ? (
        <section className="dashboard-error">
          <strong>Erreur</strong>
          <p>{error}</p>

          <button
            className="retry-button"
            type="button"
            onClick={loadThresholds}
          >
            Réessayer
          </button>
        </section>
      ) : null}

      {!loading && !error ? (
        <ThresholdForm
          machineId={MACHINE_ID}
          thresholds={thresholds}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      ) : null}
    </main>
  );
}
