import axios from "axios";

import {
  API_URL,
} from "../config/defaults.js";

//======================================================
// INSTANCE AXIOS
//======================================================

export const api = axios.create({
  baseURL: `${API_URL}/api`,

  timeout: 10000,

  headers: {
    "Content-Type":
      "application/json",
  },
});

//======================================================
// OUTILS
//======================================================

function toNullableNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
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

//======================================================
// MACHINE ID
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
    throw new Error(
      "Identifiant de machine invalide"
    );
  }

  return numericMachineId;
}

//======================================================
// JWT
//======================================================

function getStoredToken() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return localStorage.getItem(
    "authToken"
  );
}

function createAuthConfig(
  token,
  config = {}
) {
  const authToken =
    token ||
    getStoredToken();

  const headers = {
    ...(config.headers || {}),
  };

  if (authToken) {
    headers.Authorization =
      `Bearer ${authToken}`;
  }

  return {
    ...config,
    headers,
  };
}

//======================================================
// ERREURS
//======================================================

function extractErrorMessage(
  error
) {
  return (
    error?.response?.data
      ?.message ||
    error?.response?.data
      ?.error ||
    error?.message ||
    "Erreur de communication avec le serveur"
  );
}

//======================================================
// INTERCEPTEUR REQUÊTES
//======================================================

api.interceptors.request.use(
  (config) => {
    const token =
      getStoredToken();

    if (token) {
      config.headers =
        config.headers || {};

      if (
        !config.headers
          .Authorization
      ) {
        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

//======================================================
// INTERCEPTEUR RÉPONSES
//======================================================

api.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    const message =
      extractErrorMessage(
        error
      );

    console.error(
      "Erreur API :",
      message
    );

    return Promise.reject(
      error
    );
  }
);

//======================================================
// ÉTAT DE LA MACHINE
//======================================================

export async function getMachineState(
  machineId,
  token
) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const response =
    await api.get(
      "/state",

      createAuthConfig(
        token,
        {
          params: {
            machineId:
              normalizedMachineId,
          },
        }
      )
    );

  return response.data;
}

//======================================================
// HISTORIQUE
//======================================================

export async function getHistory({
  limit = 100,

  machineId,

  token,
} = {}) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const normalizedLimit =
    Math.max(
      1,
      Number(limit) || 100
    );

  const response =
    await api.get(
      "/history",

      createAuthConfig(
        token,
        {
          params: {
            limit:
              normalizedLimit,

            machineId:
              normalizedMachineId,
          },
        }
      )
    );

  return response.data;
}

export async function getHistoryByPeriod({
  period = "24h",

  machineId,

  token,
} = {}) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const response =
    await api.get(
      "/history/period",

      createAuthConfig(
        token,
        {
          params: {
            period:
              period ||
              "24h",

            machineId:
              normalizedMachineId,
          },
        }
      )
    );

  return response.data;
}

//======================================================
// ALERTES
//======================================================

export async function getAlerts({
  limit = 100,

  machineId,

  token,
} = {}) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const normalizedLimit =
    Math.max(
      1,
      Number(limit) || 100
    );

  const response =
    await api.get(
      "/alerts",

      createAuthConfig(
        token,
        {
          params: {
            limit:
              normalizedLimit,

            machineId:
              normalizedMachineId,
          },
        }
      )
    );

  return response.data;
}

//======================================================
// ALERTES ACTIVES
//======================================================

export async function getActiveAlerts(
  machineId,
  token
) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const response =
    await api.get(
      "/alerts/active",

      createAuthConfig(
        token,
        {
          params: {
            machineId:
              normalizedMachineId,
          },
        }
      )
    );

  return response.data;
}

//======================================================
// ACQUITTEMENT ALERTE
// MANAGER UNIQUEMENT CÔTÉ BACKEND
//======================================================

export async function acknowledgeAlert(
  alertId,
  token
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

  const response =
    await api.patch(
      `/alerts/${encodeURIComponent(
        alertId
      )}/acknowledge`,

      {},

      createAuthConfig(
        token
      )
    );

  return response.data;
}

//======================================================
// SEUILS
//======================================================

export async function getThresholds(
  machineId,
  token
) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const response =
    await api.get(
      "/thresholds",

      createAuthConfig(
        token,
        {
          params: {
            machineId:
              normalizedMachineId,
          },
        }
      )
    );

  return response.data;
}

//======================================================
// ENREGISTRER UN SEUIL
// MANAGER UNIQUEMENT CÔTÉ BACKEND
//======================================================

export async function saveThreshold(
  data = {},
  token
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

  const machineId =
    normalizeMachineId(
      data.machineId ??
        data.machine_id
    );

  const payload = {
    machineId,

    source:
      data.source,

    parameterName,

    minimumValue:
      toNullableNumber(
        data.minimumValue ??
          data.minimum_value
      ),

    maximumValue:
      toNullableNumber(
        data.maximumValue ??
          data.maximum_value
      ),

    warningValue:
      toNullableNumber(
        data.warningValue ??
          data.warning_value
      ),

    criticalValue:
      toNullableNumber(
        data.criticalValue ??
          data.critical_value
      ),

    unit:
      data.unit ?? "",
  };

  const response =
    await api.post(
      "/thresholds",

      payload,

      createAuthConfig(
        token
      )
    );

  return response.data;
}

//======================================================
// SUPPRIMER UN SEUIL
// MANAGER UNIQUEMENT CÔTÉ BACKEND
//======================================================

export async function deleteThreshold(
  id,
  machineId,
  token
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

  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const response =
    await api.delete(
      `/thresholds/${encodeURIComponent(
        id
      )}`,

      createAuthConfig(
        token,
        {
          params: {
            machineId:
              normalizedMachineId,
          },
        }
      )
    );

  return response.data;
}

//======================================================
// CONFIGURATION MACHINE
//======================================================

export async function getMachineConfiguration(
  machineId,
  token
) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const response =
    await api.get(
      `/configuration/${normalizedMachineId}`,

      createAuthConfig(
        token
      )
    );

  return response.data;
}

//======================================================
// ENREGISTRER CONFIGURATION
// MANAGER UNIQUEMENT CÔTÉ BACKEND
//======================================================

export async function saveMachineConfiguration(
  machineId,
  configuration = {},
  token
) {
  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  const payload = {
    ultrasonicOffsetCm:
      toNullableNumber(
        configuration
          .ultrasonicOffsetCm ??
          configuration
            .ultrasonic_offset_cm
      ) ?? 0,

    reservoirHeightCm:
      toNullableNumber(
        configuration
          .reservoirHeightCm ??
          configuration
            .reservoir_height_cm
      ) ?? 0,

    reservoirCapacityLiters:
      toNullableNumber(
        configuration
          .reservoirCapacityLiters ??
          configuration
            .reservoir_capacity_liters
      ) ?? 0,

    temperatureOffsetC:
      toNullableNumber(
        configuration
          .temperatureOffsetC ??
          configuration
            .temperature_offset_c
      ) ?? 0,
  };

  const response =
    await api.put(
      `/configuration/${normalizedMachineId}`,

      payload,

      createAuthConfig(
        token
      )
    );

  return response.data;
}

//======================================================
// API URL
//======================================================

export {
  API_URL,
};
