import axios from "axios";

import {
  API_URL,
  DEFAULT_MACHINE_ID,
} from "../config/defaults.js";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,

  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Transforme une valeur en nombre sans convertir
 * une chaîne vide ou null en 0 involontairement.
 */
function toNullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
}

function normalizeMachineId(machineId) {
  const numericMachineId = Number(machineId);

  return Number.isFinite(numericMachineId) &&
    numericMachineId > 0
    ? numericMachineId
    : DEFAULT_MACHINE_ID;
}

function extractErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Erreur de communication avec le serveur"
  );
}

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const message =
      extractErrorMessage(error);

    console.error("Erreur API :", message);

    return Promise.reject(error);
  }
);

/*
 * ===============================
 * ÉTAT DE LA MACHINE
 * ===============================
 */

export async function getMachineState(
  machineId = DEFAULT_MACHINE_ID
) {
  const response = await api.get("/state", {
    params: {
      machineId:
        normalizeMachineId(machineId),
    },
  });

  return response.data;
}

/*
 * ===============================
 * HISTORIQUE
 * ===============================
 */

export async function getHistory({
  limit = 100,
  machineId = DEFAULT_MACHINE_ID,
} = {}) {
  const normalizedLimit = Math.max(
    1,
    Number(limit) || 100
  );

  const response = await api.get("/history", {
    params: {
      limit: normalizedLimit,
      machineId:
        normalizeMachineId(machineId),
    },
  });

  return response.data;
}

export async function getHistoryByPeriod({
  period = "24h",
  machineId = DEFAULT_MACHINE_ID,
} = {}) {
  const response = await api.get(
    "/history/period",
    {
      params: {
        period: period || "24h",
        machineId:
          normalizeMachineId(machineId),
      },
    }
  );

  return response.data;
}

/*
 * ===============================
 * ALERTES
 * ===============================
 */

export async function getAlerts({
  limit = 100,
  machineId = DEFAULT_MACHINE_ID,
} = {}) {
  const normalizedLimit = Math.max(
    1,
    Number(limit) || 100
  );

  const response = await api.get("/alerts", {
    params: {
      limit: normalizedLimit,
      machineId:
        normalizeMachineId(machineId),
    },
  });

  return response.data;
}

export async function getActiveAlerts(
  machineId = DEFAULT_MACHINE_ID
) {
  const response = await api.get(
    "/alerts/active",
    {
      params: {
        machineId:
          normalizeMachineId(machineId),
      },
    }
  );

  return response.data;
}

export async function acknowledgeAlert(
  alertId
) {
  if (
    alertId === null ||
    alertId === undefined ||
    alertId === ""
  ) {
    throw new Error(
      "Identifiant d’alerte manquant"
    );
  }

  const response = await api.patch(
    `/alerts/${encodeURIComponent(
      alertId
    )}/acknowledge`
  );

  return response.data;
}

/*
 * ===============================
 * SEUILS
 * ===============================
 */

export async function getThresholds(
  machineId = DEFAULT_MACHINE_ID
) {
  const response = await api.get(
    "/thresholds",
    {
      params: {
        machineId:
          normalizeMachineId(machineId),
      },
    }
  );

  return response.data;
}

export async function saveThreshold(
  data = {}
) {
  if (!data.source) {
    throw new Error(
      "La source du seuil est obligatoire"
    );
  }

  const parameterName =
    data.parameterName ??
    data.parameter_name;

  if (!parameterName) {
    throw new Error(
      "Le paramètre du seuil est obligatoire"
    );
  }

  const payload = {
    machineId: normalizeMachineId(
      data.machineId ??
        data.machine_id
    ),

    source: data.source,

    parameterName,

    minimumValue: toNullableNumber(
      data.minimumValue ??
        data.minimum_value
    ),

    maximumValue: toNullableNumber(
      data.maximumValue ??
        data.maximum_value
    ),

    warningValue: toNullableNumber(
      data.warningValue ??
        data.warning_value
    ),

    criticalValue: toNullableNumber(
      data.criticalValue ??
        data.critical_value
    ),

    unit: data.unit ?? "",
  };

  const response = await api.post(
    "/thresholds",
    payload
  );

  return response.data;
}

export async function deleteThreshold(
  id,
  machineId = DEFAULT_MACHINE_ID
) {
  if (
    id === null ||
    id === undefined ||
    id === ""
  ) {
    throw new Error(
      "Identifiant du seuil manquant"
    );
  }

  const response = await api.delete(
    `/thresholds/${encodeURIComponent(id)}`,
    {
      params: {
        machineId:
          normalizeMachineId(machineId),
      },
    }
  );

  return response.data;
}

/*
 * ===============================
 * CONFIGURATION MACHINE
 * ===============================
 */

export async function getMachineConfiguration(
  machineId = DEFAULT_MACHINE_ID
) {
  const normalizedMachineId =
    normalizeMachineId(machineId);

  const response = await api.get(
    `/configuration/${normalizedMachineId}`
  );

  return response.data;
}

export async function saveMachineConfiguration(
  machineId = DEFAULT_MACHINE_ID,
  configuration = {}
) {
  const normalizedMachineId =
    normalizeMachineId(machineId);

  const payload = {
    ultrasonicOffsetCm:
      toNullableNumber(
        configuration.ultrasonicOffsetCm ??
          configuration.ultrasonic_offset_cm
      ) ?? 0,

    reservoirHeightCm:
      toNullableNumber(
        configuration.reservoirHeightCm ??
          configuration.reservoir_height_cm
      ) ?? 0,

    reservoirCapacityLiters:
      toNullableNumber(
        configuration.reservoirCapacityLiters ??
          configuration.reservoir_capacity_liters
      ) ?? 0,

    temperatureOffsetC:
      toNullableNumber(
        configuration.temperatureOffsetC ??
          configuration.temperature_offset_c
      ) ?? 0,
  };

  const response = await api.put(
    `/configuration/${normalizedMachineId}`,
    payload
  );

  return response.data;
}

/*
 * Conservé pour la compatibilité avec les fichiers
 * qui importent encore API_URL depuis services/api.js.
 */
export { API_URL };
