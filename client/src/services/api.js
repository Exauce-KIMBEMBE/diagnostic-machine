import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

export async function getMachineState() {
  const response = await api.get("/state");
  return response.data;
}

export async function getHistory({
  limit = 100,
  machineId = 1,
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
  machineId = 1,
} = {}) {
  const response = await api.get("/history/period", {
    params: {
      period,
      machineId,
    },
  });

  return response.data;
}

export async function getAlerts({
  limit = 100,
  machineId = 1,
} = {}) {
  const response = await api.get("/alerts", {
    params: {
      limit,
      machineId,
    },
  });

  return response.data;
}

export async function getActiveAlerts(machineId = 1) {
  const response = await api.get("/alerts/active", {
    params: {
      machineId,
    },
  });

  return response.data;
}

export async function acknowledgeAlert(alertId) {
  const response = await api.patch(
    `/alerts/${alertId}/acknowledge`
  );

  return response.data;
}

export async function getThresholds() {
  const response = await api.get("/thresholds");
  return response.data;
}

export async function saveThreshold(data) {
  const response = await api.post("/thresholds", data);
  return response.data;
}

export async function deleteThreshold(id) {
  const response = await api.delete(`/thresholds/${id}`);
  return response.data;
}

export { API_URL };