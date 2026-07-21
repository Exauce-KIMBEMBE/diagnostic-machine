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


.settings-page {
  width: min(1500px, calc(100% - 40px));
  margin: 0 auto;
  padding: 32px 0 60px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 28px;
}

.settings-header h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
}

.settings-header p {
  margin-top: 10px;
  color: var(--text-secondary);
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.back-button,
.reset-threshold-button,
.edit-threshold-button,
.delete-threshold-button,
.save-threshold-button,
.retry-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 11px;
  font-weight: 700;
}

.back-button,
.reset-threshold-button {
  background: var(--surface-light);
  color: var(--text-primary);
}

.threshold-panel {
  padding: 22px;
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.threshold-description {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.threshold-form {
  display: grid;
  grid-template-columns: repeat(
    4,
    minmax(0, 1fr)
  );
  gap: 16px;
  margin-top: 24px;
}

.threshold-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.threshold-form label > span {
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
}

.threshold-form input,
.threshold-form select {
  width: 100%;
  min-height: 46px;
  padding: 0 12px;
  color: var(--text-primary);
  background: var(--surface-light);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 11px;
  outline: none;
}

.threshold-form input:focus,
.threshold-form select:focus {
  border-color: var(--primary);
}

.threshold-form input:disabled,
.threshold-form select:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.threshold-form-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.save-threshold-button {
  background: var(--primary);
  color: white;
}

.edit-threshold-button {
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
}

.delete-threshold-button {
  background: rgba(239, 68, 68, 0.14);
  color: var(--danger);
}

.retry-button {
  margin-top: 10px;
  background: var(--danger);
  color: white;
}

.save-threshold-button:disabled,
.reset-threshold-button:disabled,
.edit-threshold-button:disabled,
.delete-threshold-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.threshold-message {
  margin: 18px 0 0;
  padding: 13px 15px;
  border-radius: 11px;
  font-weight: 700;
}

.threshold-message-success {
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.threshold-message-error {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.threshold-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.threshold-list-header h3 {
  margin: 0;
}

.threshold-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border-radius: 999px;
  font-weight: 800;
}

.threshold-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.threshold-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-left: 4px solid #64748b;
  border-radius: 13px;
}

.threshold-item-editing {
  border-left-color: var(--primary);
  background: rgba(59, 130, 246, 0.08);
}

.threshold-item-main {
  min-width: 0;
}

.threshold-item-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.threshold-item-title span {
  padding: 4px 8px;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.13);
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
}

.threshold-values {
  display: grid;
  grid-template-columns: repeat(
    4,
    minmax(100px, 1fr)
  );
  gap: 10px;
  margin-top: 14px;
}

.threshold-values > span {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 65px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.035);
  border-radius: 10px;
}

.threshold-values small {
  color: var(--text-secondary);
}

.threshold-item-actions {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.threshold-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 170px;
  margin-top: 18px;
  text-align: center;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.025);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 13px;
}

.threshold-empty-state p {
  margin: 0 0 7px;
  color: var(--text-primary);
  font-weight: 700;
}

@media (max-width: 1100px) {
  .threshold-form {
    grid-template-columns: repeat(
      2,
      minmax(0, 1fr)
    );
  }

  .threshold-values {
    grid-template-columns: repeat(
      2,
      minmax(0, 1fr)
    );
  }
}

@media (max-width: 760px) {
  .settings-page {
    width: min(100% - 24px, 1500px);
    padding-top: 22px;
  }

  .settings-header {
    flex-direction: column;
  }

  .settings-actions {
    width: 100%;
  }

  .settings-actions button {
    flex: 1;
  }

  .threshold-form {
    grid-template-columns: 1fr;
  }

  .threshold-item {
    grid-template-columns: 1fr;
  }

  .threshold-item-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .threshold-item-actions button {
    flex: 1;
  }
}

@media (max-width: 520px) {
  .settings-page {
    width: min(100% - 16px, 1500px);
  }

  .settings-actions,
  .threshold-form-actions,
  .threshold-item-actions {
    flex-direction: column;
  }

  .settings-actions button,
  .threshold-form-actions button,
  .threshold-item-actions button {
    width: 100%;
  }

  .threshold-values {
    grid-template-columns: 1fr;
  }

  .threshold-panel {
    padding: 16px;
  }
}

.power-chart-description {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.power-chart-tooltip {
  min-width: 210px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.power-chart-tooltip > strong {
  display: block;
  margin-bottom: 12px;
  color: var(--text-primary);
  font-size: 0.84rem;
}

.power-tooltip-values {
  display: grid;
  gap: 8px;
}

.power-tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.power-tooltip-row span {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.power-tooltip-row strong {
  color: var(--text-primary);
}


.metric-normal {
  color: #10b981;
}

.metric-warning {
  color: #f59e0b;
}

.metric-critical {
  color: #ef4444;
}

.metric-offline {
  color: #94a3b8;
}

.line-update {
  margin: 18px 0 0;
  padding-top: 14px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.line-update strong {
  color: var(--text-primary);
}
