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

//======================================================
// OUTILS
//======================================================

function extractArray(response) {
  const data =
    response?.data?.data ??
    response?.data ??
    response;

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.items
    )
  ) {
    return data.items;
  }

  if (
    Array.isArray(
      data?.results
    )
  ) {
    return data.results;
  }

  return [];
}

//======================================================
// NORMALISATION MACHINE ID
//======================================================

function normalizeMachineId(
  machineId
) {
  const numericMachineId =
    Number(machineId);

  if (
    !Number.isInteger(
      numericMachineId
    ) ||
    numericMachineId <= 0
  ) {
    return null;
  }

  return numericMachineId;
}

//======================================================
// NORMALISATION SEUIL
//======================================================

function normalizeThreshold(
  threshold,
  machineId
) {
  if (
    !threshold ||
    typeof threshold !==
      "object"
  ) {
    return null;
  }

  const normalizedMachineId =
    Number(
      threshold.machineId ??
        threshold.machine_id ??
        machineId
    );

  return {
    ...threshold,

    id:
      threshold.id ??
      threshold.thresholdId ??
      threshold.threshold_id,

    machineId:
      Number.isInteger(
        normalizedMachineId
      ) &&
      normalizedMachineId > 0
        ? normalizedMachineId
        : machineId,

    source:
      threshold.source ??
      "",

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
      threshold.unit ??
      "",
  };
}

//======================================================
// SETTINGS
//======================================================

export default function Settings({
  onBack,

  token,

  user,

  machineId,
}) {
  //====================================================
  // MACHINE
  //====================================================

  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  //====================================================
  // UTILISATEUR
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
  // ÉTATS
  //====================================================

  const [
    thresholds,
    setThresholds,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  //====================================================
  // CHARGEMENT DES SEUILS
  //====================================================

  const loadThresholds =
    useCallback(
      async () => {
        if (
          !normalizedMachineId
        ) {
          setThresholds([]);

          setError(
            "Aucune machine sélectionnée."
          );

          setLoading(false);

          return;
        }

        if (!token) {
          setThresholds([]);

          setError(
            "Session utilisateur invalide."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);

          setError("");

          const response =
            await getThresholds(
              normalizedMachineId,
              token
            );

          const receivedThresholds =
            extractArray(
              response
            )
              .map(
                (
                  threshold
                ) =>
                  normalizeThreshold(
                    threshold,
                    normalizedMachineId
                  )
              )
              .filter(
                Boolean
              );

          setThresholds(
            receivedThresholds
          );
        } catch (
          requestError
        ) {
          console.error(
            "Erreur chargement des seuils :",
            requestError
          );

          const status =
            requestError
              ?.response
              ?.status;

          if (
            status === 401
          ) {
            setError(
              "Votre session n'est plus valide."
            );

            return;
          }

          if (
            status === 403
          ) {
            setError(
              "Vous n'avez pas accès à cette machine."
            );

            return;
          }

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
              requestError
                ?.message ||
              "Impossible de charger les seuils."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        normalizedMachineId,
        token,
      ]
    );

  //====================================================
  // RECHARGEMENT AU CHANGEMENT DE MACHINE
  //====================================================

  useEffect(() => {
    setThresholds([]);

    setError("");

    loadThresholds();
  }, [
    loadThresholds,
  ]);

  //====================================================
  // SEUIL ENREGISTRÉ
  //====================================================

  function handleSaved(
    savedThresholdResponse
  ) {
    const savedThreshold =
      normalizeThreshold(
        savedThresholdResponse
          ?.data
          ?.data ??
          savedThresholdResponse
            ?.data ??
          savedThresholdResponse,
        normalizedMachineId
      );

    if (
      !savedThreshold
    ) {
      return;
    }

    setThresholds(
      (
        previousThresholds
      ) => {
        const existingIndex =
          previousThresholds.findIndex(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                savedThreshold.id
              )
          );

        if (
          existingIndex === -1
        ) {
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
  // SEUIL SUPPRIMÉ
  //====================================================

  function handleDeleted(
    thresholdId
  ) {
    setThresholds(
      (
        previousThresholds
      ) =>
        previousThresholds.filter(
          (item) =>
            Number(
              item.id
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

  if (
    !normalizedMachineId
  ) {
    return (
      <main className="settings-page">
        <header className="settings-header">
          <div className="settings-heading">
            <span className="dashboard-eyebrow">
              Configuration
            </span>

            <h1>
              <Settings2
                size={30}
              />

              Paramètres
            </h1>
          </div>

          <div className="settings-actions">
            <button
              className="back-button"
              type="button"
              onClick={
                onBack
              }
            >
              <ArrowLeft
                size={18}
              />

              Retour au tableau de bord
            </button>
          </div>
        </header>

        <section className="dashboard-error">
          <strong>
            Aucune machine sélectionnée
          </strong>

          <p>
            Sélectionnez une machine
            avant d'ouvrir ses paramètres.
          </p>
        </section>
      </main>
    );
  }

  //====================================================
  // PROTECTION CLIENT
  //====================================================

  if (!isManager) {
    return (
      <main className="settings-page">
        <header className="settings-header">
          <div className="settings-heading">
            <span className="dashboard-eyebrow">
              Configuration
            </span>

            <h1>
              <Settings2
                size={30}
              />

              Paramètres
            </h1>

            <p>
              Configuration de la machine
              sélectionnée.
            </p>
          </div>

          <div className="settings-actions">
            <button
              className="back-button"
              type="button"
              onClick={
                onBack
              }
            >
              <ArrowLeft
                size={18}
              />

              Retour au tableau de bord
            </button>
          </div>
        </header>

        <section className="dashboard-error">
          <strong>
            Accès réservé au manager
          </strong>

          <p>
            Votre compte peut consulter
            les données de la machine,
            les alertes et les seuils,
            mais il ne peut pas modifier
            sa configuration.
          </p>
        </section>
      </main>
    );
  }

  //====================================================
  // AFFICHAGE MANAGER
  //====================================================

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div className="settings-heading">
          <span className="dashboard-eyebrow">
            Configuration
          </span>

          <h1>
            <Settings2
              size={30}
            />

            Paramètres
          </h1>

          <p>
            Définis les seuils minimaux,
            maximaux, d'avertissement et
            critiques de la machine{" "}
            <strong>
              #{normalizedMachineId}
            </strong>
            .
          </p>
        </div>

        <div className="settings-actions">
          <button
            className="refresh-button"
            type="button"
            onClick={
              loadThresholds
            }
            disabled={
              loading
            }
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
            onClick={
              onBack
            }
          >
            <ArrowLeft
              size={18}
            />

            Retour au tableau de bord
          </button>
        </div>
      </header>

      {/* ==============================================
          CHARGEMENT
      ============================================== */}

      {loading && (
        <section className="dashboard-message">
          Chargement des seuils...
        </section>
      )}

      {/* ==============================================
          ERREUR
      ============================================== */}

      {error && (
        <section className="dashboard-error">
          <strong>
            Erreur
          </strong>

          <p>
            {error}
          </p>

          <button
            className="retry-button"
            type="button"
            onClick={
              loadThresholds
            }
          >
            Réessayer
          </button>
        </section>
      )}

      {/* ==============================================
          FORMULAIRE
      ============================================== */}

      {!loading &&
        !error && (
          <ThresholdForm
            machineId={
              normalizedMachineId
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
    </main>
  );
}
