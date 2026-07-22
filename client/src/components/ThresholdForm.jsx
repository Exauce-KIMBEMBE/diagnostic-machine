import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Edit3,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

import {
  deleteThreshold,
  saveThreshold,
} from "../services/api.js";

const SOURCE_OPTIONS = [
  {
    value: "L1",
    label: "Ligne 1",
  },
  {
    value: "L2",
    label: "Ligne 2",
  },
  {
    value: "L3",
    label: "Ligne 3",
  },
  {
    value: "temperature",
    label: "Température",
  },
  {
    value: "flow",
    label: "Débit",
  },
  {
    value: "tank",
    label: "Réservoir",
  },
];

const ELECTRICAL_PARAMETERS = [
  {
    value: "voltage",
    label: "Tension",
    unit: "V",
  },
  {
    value: "current",
    label: "Courant",
    unit: "A",
  },
  {
    value: "power",
    label: "Puissance active",
    unit: "W",
  },
  {
    value: "apparentPower",
    label: "Puissance apparente",
    unit: "VA",
  },
  {
    value: "reactivePower",
    label: "Puissance réactive",
    unit: "VAR",
  },
  {
    value: "energy",
    label: "Énergie",
    unit: "kWh",
  },
  {
    value: "frequency",
    label: "Fréquence",
    unit: "Hz",
  },
  {
    value: "powerFactor",
    label: "Facteur de puissance",
    unit: "",
  },
];

const PARAMETER_OPTIONS = {
  L1: ELECTRICAL_PARAMETERS,
  L2: ELECTRICAL_PARAMETERS,
  L3: ELECTRICAL_PARAMETERS,

  temperature: [
    {
      value: "temperature",
      label: "Température",
      unit: "°C",
    },
  ],

  flow: [
    {
      value: "flow",
      label: "Débit",
      unit: "L/min",
    },
  ],

  tank: [
    {
      value: "levelPercent",
      label: "Niveau",
      unit: "%",
    },
    {
      value: "levelCm",
      label: "Hauteur de liquide",
      unit: "cm",
    },
    {
      value: "distanceCm",
      label: "Distance du capteur",
      unit: "cm",
    },
    {
      value: "volumeLiters",
      label: "Volume disponible",
      unit: "L",
    },
  ],
};

const PARAMETER_LABELS = Object.values(
  PARAMETER_OPTIONS
)
  .flat()
  .reduce(
    (labels, parameter) => ({
      ...labels,
      [parameter.value]:
        parameter.label,
    }),
    {}
  );

function createEmptyForm(
  machineId = 1
) {
  return {
    id: null,
    machineId:
      Number(machineId) || 1,
    source: "L1",
    parameterName: "voltage",
    minimumValue: "",
    maximumValue: "",
    warningValue: "",
    criticalValue: "",
    unit: "V",
  };
}

function getValue(
  object,
  camelCaseKey,
  snakeCaseKey
) {
  return (
    object?.[camelCaseKey] ??
    object?.[snakeCaseKey] ??
    ""
  );
}

function normalizeThreshold(
  threshold,
  machineId = 1
) {
  return {
    ...threshold,

    id:
      threshold?.id ??
      threshold?.thresholdId ??
      threshold?.threshold_id ??
      null,

    machineId:
      Number(
        getValue(
          threshold,
          "machineId",
          "machine_id"
        )
      ) ||
      Number(machineId) ||
      1,

    source:
      threshold?.source ??
      "L1",

    parameterName:
      getValue(
        threshold,
        "parameterName",
        "parameter_name"
      ) || "voltage",

    minimumValue:
      getValue(
        threshold,
        "minimumValue",
        "minimum_value"
      ),

    maximumValue:
      getValue(
        threshold,
        "maximumValue",
        "maximum_value"
      ),

    warningValue:
      getValue(
        threshold,
        "warningValue",
        "warning_value"
      ),

    criticalValue:
      getValue(
        threshold,
        "criticalValue",
        "critical_value"
      ),

    unit:
      threshold?.unit ??
      "",
  };
}

function extractSavedThreshold(
  response
) {
  return (
    response?.data?.data ??
    response?.data ??
    response
  );
}

function toNullableNumber(
  value
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : null;
}

function formatThresholdValue(
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

  return `${value}${
    unit
      ? ` ${unit}`
      : ""
  }`;
}

function getSourceLabel(
  source
) {
  return (
    SOURCE_OPTIONS.find(
      (option) =>
        option.value === source
    )?.label ??
    source
  );
}

function getParameterLabel(
  parameterName
) {
  return (
    PARAMETER_LABELS[
      parameterName
    ] ??
    parameterName
  );
}

export default function ThresholdForm({
  machineId = 1,
  thresholds = [],
  onSaved,
  onDeleted,
}) {
  const [
    form,
    setForm,
  ] = useState(() =>
    createEmptyForm(machineId)
  );

  const [
    editingId,
    setEditingId,
  ] = useState(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState("");

  useEffect(() => {
    if (!editingId) {
      setForm(
        createEmptyForm(
          machineId
        )
      );
    }
  }, [
    machineId,
    editingId,
  ]);

  const availableParameters =
    PARAMETER_OPTIONS[
      form.source
    ] ??
    PARAMETER_OPTIONS.L1;

  const normalizedThresholds =
    useMemo(() => {
      if (
        !Array.isArray(
          thresholds
        )
      ) {
        return [];
      }

      return thresholds
        .map((threshold) =>
          normalizeThreshold(
            threshold,
            machineId
          )
        )
        .sort(
          (
            first,
            second
          ) => {
            const sourceComparison =
              String(
                first.source
              ).localeCompare(
                String(
                  second.source
                ),
                "fr"
              );

            if (
              sourceComparison !==
              0
            ) {
              return sourceComparison;
            }

            return String(
              first.parameterName
            ).localeCompare(
              String(
                second.parameterName
              ),
              "fr"
            );
          }
        );
    }, [
      thresholds,
      machineId,
    ]);

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

  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    clearMessage();

    if (
      name === "source"
    ) {
      const sourceParameters =
        PARAMETER_OPTIONS[
          value
        ] ??
        PARAMETER_OPTIONS.L1;

      const firstParameter =
        sourceParameters[0];

      setForm(
        (previousForm) => ({
          ...previousForm,
          source: value,
          parameterName:
            firstParameter.value,
          unit:
            firstParameter.unit,
        })
      );

      return;
    }

    if (
      name ===
      "parameterName"
    ) {
      const selectedParameter =
        availableParameters.find(
          (parameter) =>
            parameter.value ===
            value
        );

      setForm(
        (previousForm) => ({
          ...previousForm,
          parameterName:
            value,
          unit:
            selectedParameter
              ?.unit ??
            previousForm.unit,
        })
      );

      return;
    }

    setForm(
      (previousForm) => ({
        ...previousForm,
        [name]: value,
      })
    );
  }

  function resetForm() {
    setForm(
      createEmptyForm(
        machineId
      )
    );

    setEditingId(null);
    clearMessage();
  }

  function handleEdit(
    threshold
  ) {
    const normalized =
      normalizeThreshold(
        threshold,
        machineId
      );

    setForm({
      ...createEmptyForm(
        machineId
      ),
      ...normalized,

      minimumValue:
        normalized.minimumValue ??
        "",

      maximumValue:
        normalized.maximumValue ??
        "",

      warningValue:
        normalized.warningValue ??
        "",

      criticalValue:
        normalized.criticalValue ??
        "",
    });

    setEditingId(
      normalized.id
    );

    clearMessage();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validateForm() {
    const minimum =
      toNullableNumber(
        form.minimumValue
      );

    const maximum =
      toNullableNumber(
        form.maximumValue
      );

    const warning =
      toNullableNumber(
        form.warningValue
      );

    const critical =
      toNullableNumber(
        form.criticalValue
      );

    if (!form.source) {
      return "Sélectionne une source.";
    }

    if (
      !form.parameterName
    ) {
      return "Sélectionne un paramètre.";
    }

    if (
      minimum === null &&
      maximum === null &&
      warning === null &&
      critical === null
    ) {
      return "Renseigne au moins une valeur de seuil.";
    }

    if (
      minimum !== null &&
      maximum !== null &&
      minimum > maximum
    ) {
      return "La valeur minimale ne peut pas être supérieure à la valeur maximale.";
    }

    if (
      warning !== null &&
      critical !== null &&
      warning > critical
    ) {
      return "Le seuil d’avertissement ne peut pas être supérieur au seuil critique.";
    }

    if (
      minimum !== null &&
      warning !== null &&
      warning < minimum
    ) {
      return "Le seuil d’avertissement ne peut pas être inférieur au minimum.";
    }

    if (
      minimum !== null &&
      critical !== null &&
      critical < minimum
    ) {
      return "Le seuil critique ne peut pas être inférieur au minimum.";
    }

    return "";
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const validationMessage =
      validateForm();

    if (
      validationMessage
    ) {
      showMessage(
        "error",
        validationMessage
      );

      return;
    }

    try {
      setSaving(true);
      clearMessage();

      const payload = {
        id:
          editingId ??
          null,

        machineId:
          Number(machineId) ||
          1,

        source:
          form.source,

        parameterName:
          form.parameterName,

        minimumValue:
          toNullableNumber(
            form.minimumValue
          ),

        maximumValue:
          toNullableNumber(
            form.maximumValue
          ),

        warningValue:
          toNullableNumber(
            form.warningValue
          ),

        criticalValue:
          toNullableNumber(
            form.criticalValue
          ),

        unit:
          form.unit.trim() ||
          null,
      };

      const response =
        await saveThreshold(
          payload
        );

      const savedThreshold =
        normalizeThreshold(
          extractSavedThreshold(
            response
          ),
          machineId
        );

      onSaved?.(
        savedThreshold
      );

      setForm(
        createEmptyForm(
          machineId
        )
      );

      setEditingId(null);

      showMessage(
        "success",
        editingId
          ? "Seuil modifié avec succès."
          : "Seuil enregistré avec succès."
      );
    } catch (error) {
      console.error(
        "Erreur enregistrement du seuil :",
        error
      );

      showMessage(
        "error",
        error?.response?.data
          ?.message ??
          error?.message ??
          "Impossible d’enregistrer le seuil."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    threshold
  ) {
    const normalized =
      normalizeThreshold(
        threshold,
        machineId
      );

    if (!normalized.id) {
      showMessage(
        "error",
        "Identifiant du seuil introuvable."
      );

      return;
    }

    const parameterLabel =
      getParameterLabel(
        normalized.parameterName
      );

    const sourceLabel =
      getSourceLabel(
        normalized.source
      );

    const confirmed =
      window.confirm(
        `Supprimer le seuil ${sourceLabel} — ${parameterLabel} ?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        normalized.id
      );

      clearMessage();

      await deleteThreshold(
        normalized.id,
        machineId
      );

      if (
        Number(editingId) ===
        Number(normalized.id)
      ) {
        setForm(
          createEmptyForm(
            machineId
          )
        );

        setEditingId(null);
      }

      onDeleted?.(
        normalized.id
      );

      showMessage(
        "success",
        "Seuil supprimé avec succès."
      );
    } catch (error) {
      console.error(
        "Erreur suppression du seuil :",
        error
      );

      showMessage(
        "error",
        error?.response?.data
          ?.message ??
          error?.message ??
          "Impossible de supprimer le seuil."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="threshold-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">
            Configuration
          </span>

          <h2>
            {editingId
              ? "Modifier un seuil"
              : "Ajouter un seuil"}
          </h2>

          <p className="threshold-description">
            Définis les limites utilisées
            pour détecter les anomalies de
            la machine.
          </p>
        </div>

        {editingId ? (
          <button
            className="reset-threshold-button"
            type="button"
            onClick={
              resetForm
            }
            disabled={
              saving
            }
          >
            <Plus size={18} />
            Nouveau seuil
          </button>
        ) : null}
      </div>

      <form
        className="threshold-form"
        onSubmit={
          handleSubmit
        }
      >
        <label>
          <span>
            Source
          </span>

          <select
            name="source"
            value={
              form.source
            }
            onChange={
              handleChange
            }
            disabled={
              saving
            }
          >
            {SOURCE_OPTIONS.map(
              (source) => (
                <option
                  key={
                    source.value
                  }
                  value={
                    source.value
                  }
                >
                  {
                    source.label
                  }
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span>
            Paramètre
          </span>

          <select
            name="parameterName"
            value={
              form.parameterName
            }
            onChange={
              handleChange
            }
            disabled={
              saving
            }
          >
            {availableParameters.map(
              (parameter) => (
                <option
                  key={
                    parameter.value
                  }
                  value={
                    parameter.value
                  }
                >
                  {
                    parameter.label
                  }
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span>
            Minimum
          </span>

          <input
            name="minimumValue"
            type="number"
            step="any"
            value={
              form.minimumValue
            }
            onChange={
              handleChange
            }
            placeholder="Ex. 210"
            disabled={
              saving
            }
          />
        </label>

        <label>
          <span>
            Maximum
          </span>

          <input
            name="maximumValue"
            type="number"
            step="any"
            value={
              form.maximumValue
            }
            onChange={
              handleChange
            }
            placeholder="Ex. 250"
            disabled={
              saving
            }
          />
        </label>

        <label>
          <span>
            Avertissement
          </span>

          <input
            name="warningValue"
            type="number"
            step="any"
            value={
              form.warningValue
            }
            onChange={
              handleChange
            }
            placeholder="Valeur d’alerte"
            disabled={
              saving
            }
          />
        </label>

        <label>
          <span>
            Critique
          </span>

          <input
            name="criticalValue"
            type="number"
            step="any"
            value={
              form.criticalValue
            }
            onChange={
              handleChange
            }
            placeholder="Valeur critique"
            disabled={
              saving
            }
          />
        </label>

        <label>
          <span>
            Unité
          </span>

          <input
            name="unit"
            type="text"
            value={
              form.unit
            }
            onChange={
              handleChange
            }
            placeholder="V, A, °C..."
            disabled={
              saving
            }
          />
        </label>

        <div className="threshold-form-actions">
          <button
            className="save-threshold-button"
            type="submit"
            disabled={
              saving
            }
          >
            <Save size={18} />

            {saving
              ? "Enregistrement..."
              : editingId
                ? "Enregistrer les modifications"
                : "Enregistrer le seuil"}
          </button>

          <button
            className="reset-threshold-button"
            type="button"
            onClick={
              resetForm
            }
            disabled={
              saving
            }
          >
            <RotateCcw
              size={18}
            />

            Réinitialiser
          </button>
        </div>
      </form>

      {message ? (
        <p
          className={`threshold-message threshold-message-${messageType}`}
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

      <div className="threshold-list-header">
        <div>
          <span className="panel-eyebrow">
            Seuils enregistrés
          </span>

          <h3>
            Configuration actuelle
          </h3>
        </div>

        <span className="threshold-count">
          {
            normalizedThresholds.length
          }
        </span>
      </div>

      {normalizedThresholds.length ===
      0 ? (
        <div className="threshold-empty-state">
          <p>
            Aucun seuil enregistré pour
            cette machine.
          </p>

          <span>
            Utilise le formulaire
            ci-dessus pour ajouter ton
            premier seuil.
          </span>
        </div>
      ) : (
        <div className="threshold-list">
          {normalizedThresholds.map(
            (threshold) => {
              const parameterLabel =
                getParameterLabel(
                  threshold.parameterName
                );

              const sourceLabel =
                getSourceLabel(
                  threshold.source
                );

              const isDeleting =
                Number(
                  deletingId
                ) ===
                Number(
                  threshold.id
                );

              const isEditing =
                Number(
                  editingId
                ) ===
                Number(
                  threshold.id
                );

              return (
                <article
                  className={`threshold-item ${
                    isEditing
                      ? "threshold-item-editing"
                      : ""
                  }`}
                  key={
                    threshold.id ??
                    `${threshold.source}-${threshold.parameterName}`
                  }
                >
                  <div className="threshold-item-main">
                    <div className="threshold-item-title">
                      <strong>
                        {
                          sourceLabel
                        }
                      </strong>

                      <span>
                        {
                          parameterLabel
                        }
                      </span>
                    </div>

                    <div className="threshold-values">
                      <span>
                        <small>
                          Minimum
                        </small>

                        <strong>
                          {formatThresholdValue(
                            threshold.minimumValue,
                            threshold.unit
                          )}
                        </strong>
                      </span>

                      <span>
                        <small>
                          Maximum
                        </small>

                        <strong>
                          {formatThresholdValue(
                            threshold.maximumValue,
                            threshold.unit
                          )}
                        </strong>
                      </span>

                      <span>
                        <small>
                          Avertissement
                        </small>

                        <strong>
                          {formatThresholdValue(
                            threshold.warningValue,
                            threshold.unit
                          )}
                        </strong>
                      </span>

                      <span>
                        <small>
                          Critique
                        </small>

                        <strong>
                          {formatThresholdValue(
                            threshold.criticalValue,
                            threshold.unit
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="threshold-item-actions">
                    <button
                      className="edit-threshold-button"
                      type="button"
                      onClick={() =>
                        handleEdit(
                          threshold
                        )
                      }
                      disabled={
                        saving ||
                        isDeleting
                      }
                    >
                      <Edit3
                        size={17}
                      />

                      Modifier
                    </button>

                    <button
                      className="delete-threshold-button"
                      type="button"
                      onClick={() =>
                        handleDelete(
                          threshold
                        )
                      }
                      disabled={
                        saving ||
                        isDeleting
                      }
                    >
                      <Trash2
                        size={17}
                      />

                      {isDeleting
                        ? "Suppression..."
                        : "Supprimer"}
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
