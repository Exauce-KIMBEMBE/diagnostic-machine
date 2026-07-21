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

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Erreur de communication avec le serveur";

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
      machineId,
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
  const response = await api.get("/history", {
    params: {
      limit,
      machineId,
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
        period,
        machineId,
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
  const response = await api.get("/alerts", {
    params: {
      limit,
      machineId,
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
        machineId,
      },
    }
  );

  return response.data;
}

export async function acknowledgeAlert(
  alertId
) {
  if (!alertId) {
    throw new Error(
      "Identifiant d’alerte manquant"
    );
  }

  const response = await api.patch(
    `/alerts/${alertId}/acknowledge`
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
        machineId,
      },
    }
  );

  return response.data;
}

export async function saveThreshold(data) {
  const payload = {
    machineId:
      Number(data.machineId) ||
      DEFAULT_MACHINE_ID,

    source: data.source,

    parameterName:
      data.parameterName ??
      data.parameter_name,

    minimumValue:
      data.minimumValue ??
      data.minimum_value ??
      null,

    maximumValue:
      data.maximumValue ??
      data.maximum_value ??
      null,

    warningValue:
      data.warningValue ??
      data.warning_value ??
      null,

    criticalValue:
      data.criticalValue ??
      data.critical_value ??
      null,

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
  if (!id) {
    throw new Error(
      "Identifiant du seuil manquant"
    );
  }

  const response = await api.delete(
    `/thresholds/${id}`,
    {
      params: {
        machineId,
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
  const response = await api.get(
    `/configuration/${machineId}`
  );

  return response.data;
}

export async function saveMachineConfiguration(
  machineId = DEFAULT_MACHINE_ID,
  configuration = {}
) {
  const payload = {
    ultrasonicOffsetCm:
      Number(
        configuration.ultrasonicOffsetCm ??
          configuration.ultrasonic_offset_cm
      ) || 0,

    reservoirHeightCm:
      Number(
        configuration.reservoirHeightCm ??
          configuration.reservoir_height_cm
      ) || 0,

    reservoirCapacityLiters:
      Number(
        configuration.reservoirCapacityLiters ??
          configuration.reservoir_capacity_liters
      ) || 0,

    temperatureOffsetC:
      Number(
        configuration.temperatureOffsetC ??
          configuration.temperature_offset_c
      ) || 0,
  };

  const response = await api.put(
    `/configuration/${machineId}`,
    payload
  );

  return response.data;
}

export { API_URL };
