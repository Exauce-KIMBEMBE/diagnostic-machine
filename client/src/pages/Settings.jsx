import { useEffect, useState } from "react";
import { ArrowLeft, Settings2 } from "lucide-react";

import ThresholdForm from "../components/ThresholdForm.jsx";
import { getThresholds } from "../services/api.js";

export default function Settings({
  onBack,
}) {
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadThresholds() {
    try {
      setLoading(true);
      setError("");

      const response = await getThresholds();

      setThresholds(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (requestError) {
      console.error(
        "Erreur chargement des seuils :",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Impossible de charger les seuils"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThresholds();
  }, []);

  function handleSaved(savedThreshold) {
    setThresholds((previousThresholds) => {
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

      return previousThresholds.map((item) =>
        Number(item.id) ===
        Number(savedThreshold.id)
          ? savedThreshold
          : item
      );
    });
  }

  function handleDeleted(thresholdId) {
    setThresholds((previousThresholds) =>
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
            Définis les valeurs minimales,
            maximales, d’avertissement et critiques.
          </p>
        </div>

        <button
          className="back-button"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Retour au tableau de bord
        </button>
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
        </section>
      ) : null}

      {!loading ? (
        <ThresholdForm
          thresholds={thresholds}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      ) : null}
    </main>
  );
}