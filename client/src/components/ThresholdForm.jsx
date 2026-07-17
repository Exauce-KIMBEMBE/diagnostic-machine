import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import {
  saveThreshold,
  deleteThreshold,
} from "../services/api.js";

const emptyForm = {
  source: "L1",
  parameterName: "voltage",
  minimumValue: "",
  maximumValue: "",
  warningValue: "",
  criticalValue: "",
  unit: "V",
};

export default function ThresholdForm({
  thresholds = [],
  onSaved,
  onDeleted,
}) {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMessage("");
  }, [thresholds]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        source: form.source,
        parameterName: form.parameterName,
        minimumValue:
          form.minimumValue === ""
            ? null
            : Number(form.minimumValue),
        maximumValue:
          form.maximumValue === ""
            ? null
            : Number(form.maximumValue),
        warningValue:
          form.warningValue === ""
            ? null
            : Number(form.warningValue),
        criticalValue:
          form.criticalValue === ""
            ? null
            : Number(form.criticalValue),
        unit: form.unit || null,
      };

      const response = await saveThreshold(payload);

      setMessage("Seuil enregistré avec succès.");

      if (onSaved) {
        onSaved(response.data);
      }
    } catch (error) {
      console.error(
        "Erreur enregistrement du seuil :",
        error
      );

      setMessage(
        error.response?.data?.message ||
          "Impossible d’enregistrer le seuil."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteThreshold(id);

      if (onDeleted) {
        onDeleted(id);
      }
    } catch (error) {
      console.error(
        "Erreur suppression du seuil :",
        error
      );
    }
  }

  return (
    <section className="threshold-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">
            Configuration
          </span>

          <h2>Seuils critiques</h2>
        </div>
      </div>

      <form
        className="threshold-form"
        onSubmit={handleSubmit}
      >
        <label>
          <span>Source</span>

          <select
            name="source"
            value={form.source}
            onChange={handleChange}
          >
            <option value="L1">Ligne 1</option>
            <option value="L2">Ligne 2</option>
            <option value="L3">Ligne 3</option>
            <option value="temperature">
              Température
            </option>
            <option value="flow">Débit</option>
          </select>
        </label>

        <label>
          <span>Paramètre</span>

          <select
            name="parameterName"
            value={form.parameterName}
            onChange={handleChange}
          >
            <option value="voltage">Tension</option>
            <option value="current">Courant</option>
            <option value="power">Puissance</option>
            <option value="frequency">
              Fréquence
            </option>
            <option value="powerFactor">
              Facteur de puissance
            </option>
            <option value="temperature">
              Température
            </option>
            <option value="flow">Débit</option>
          </select>
        </label>

        <label>
          <span>Minimum</span>

          <input
            name="minimumValue"
            type="number"
            step="0.01"
            value={form.minimumValue}
            onChange={handleChange}
          />
        </label>

        <label>
          <span>Maximum</span>

          <input
            name="maximumValue"
            type="number"
            step="0.01"
            value={form.maximumValue}
            onChange={handleChange}
          />
        </label>

        <label>
          <span>Avertissement</span>

          <input
            name="warningValue"
            type="number"
            step="0.01"
            value={form.warningValue}
            onChange={handleChange}
          />
        </label>

        <label>
          <span>Critique</span>

          <input
            name="criticalValue"
            type="number"
            step="0.01"
            value={form.criticalValue}
            onChange={handleChange}
          />
        </label>

        <label>
          <span>Unité</span>

          <input
            name="unit"
            type="text"
            value={form.unit}
            onChange={handleChange}
          />
        </label>

        <button
          className="save-threshold-button"
          type="submit"
          disabled={saving}
        >
          <Save size={18} />

          {saving
            ? "Enregistrement..."
            : "Enregistrer"}
        </button>
      </form>

      {message ? (
        <p className="threshold-message">
          {message}
        </p>
      ) : null}

      <div className="threshold-list">
        {thresholds.map((threshold) => (
          <article
            className="threshold-item"
            key={threshold.id}
          >
            <div>
              <strong>
                {threshold.source} —{" "}
                {threshold.parameter_name}
              </strong>

              <span>
                Min :{" "}
                {threshold.minimum_value ?? "--"} ·
                Max :{" "}
                {threshold.maximum_value ?? "--"} ·
                Avertissement :{" "}
                {threshold.warning_value ?? "--"} ·
                Critique :{" "}
                {threshold.critical_value ?? "--"}{" "}
                {threshold.unit ?? ""}
              </span>
            </div>

            <button
              className="delete-threshold-button"
              type="button"
              onClick={() =>
                handleDelete(threshold.id)
              }
            >
              Supprimer
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}