import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import {
  API_URL,
  getMachineState,
  getHistoryByPeriod,
  getActiveAlerts,
  getThresholds,
} from "../services/api.js";

const initialState = {
  machineId: 1,
  timestamp: null,

  lines: {
    L1: {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
      status: "offline",
    },

    L2: {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
      status: "offline",
    },

    L3: {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
      status: "offline",
    },
  },

  temperature: {
    value: 0,
    status: "offline",
  },

  flow: {
    value: 0,
    status: "offline",
  },

  alerts: [],
};

export function useMachineData(machineId = 1) {
  const [machine, setMachine] = useState(initialState);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [period, setPeriod] = useState("24h");

  const [socketConnected, setSocketConnected] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        machineResponse,
        historyResponse,
        alertsResponse,
        thresholdsResponse,
      ] = await Promise.all([
        getMachineState(),

        getHistoryByPeriod({
          period,
          machineId,
        }),

        getActiveAlerts(machineId),

        getThresholds(),
      ]);

      setMachine(machineResponse);

      setHistory(
        Array.isArray(historyResponse.data)
          ? historyResponse.data
          : []
      );

      setAlerts(
        Array.isArray(alertsResponse.data)
          ? alertsResponse.data
          : []
      );

      setThresholds(
        Array.isArray(thresholdsResponse.data)
          ? thresholdsResponse.data
          : []
      );
    } catch (requestError) {
      console.error(
        "Erreur chargement du tableau de bord :",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Impossible de charger les données"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [machineId, period]);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("connect_error", (socketError) => {
      console.error(
        "Erreur Socket.IO :",
        socketError.message
      );

      setSocketConnected(false);
    });

    socket.on("machine:update", (data) => {
      const receivedMachineId =
        Number(data.machineId) || 1;

      if (receivedMachineId !== Number(machineId)) {
        return;
      }

      setMachine(data);

      setHistory((previousHistory) => {
        const newHistoryItem = {
          machine_id: receivedMachineId,

          l1_voltage: data.lines.L1.voltage,
          l1_current: data.lines.L1.current,
          l1_power: data.lines.L1.power,
          l1_energy: data.lines.L1.energy,
          l1_frequency: data.lines.L1.frequency,
          l1_power_factor:
            data.lines.L1.powerFactor,

          l2_voltage: data.lines.L2.voltage,
          l2_current: data.lines.L2.current,
          l2_power: data.lines.L2.power,
          l2_energy: data.lines.L2.energy,
          l2_frequency: data.lines.L2.frequency,
          l2_power_factor:
            data.lines.L2.powerFactor,

          l3_voltage: data.lines.L3.voltage,
          l3_current: data.lines.L3.current,
          l3_power: data.lines.L3.power,
          l3_energy: data.lines.L3.energy,
          l3_frequency: data.lines.L3.frequency,
          l3_power_factor:
            data.lines.L3.powerFactor,

          temperature: data.temperature.value,
          flow_rate: data.flow.value,
          created_at: data.timestamp,
        };

        return [
          ...previousHistory,
          newHistoryItem,
        ].slice(-1000);
      });

      setAlerts(
        Array.isArray(data.alerts)
          ? data.alerts
          : []
      );
    });

    socket.on("alert:acknowledged", ({ id }) => {
      setAlerts((previousAlerts) =>
        previousAlerts.filter(
          (alert) => Number(alert.id) !== Number(id)
        )
      );
    });

    socket.on("threshold:update", (threshold) => {
      setThresholds((previousThresholds) => {
        const existingIndex =
          previousThresholds.findIndex(
            (item) =>
              Number(item.id) ===
              Number(threshold.id)
          );

        if (existingIndex === -1) {
          return [
            ...previousThresholds,
            threshold,
          ];
        }

        return previousThresholds.map((item) =>
          Number(item.id) ===
          Number(threshold.id)
            ? threshold
            : item
        );
      });
    });

    socket.on("threshold:delete", ({ id }) => {
      setThresholds((previousThresholds) =>
        previousThresholds.filter(
          (item) =>
            Number(item.id) !== Number(id)
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [machineId]);

  return {
    machine,
    history,
    alerts,
    thresholds,

    period,
    setPeriod,

    socketConnected,
    loading,
    error,

    reload: loadDashboard,
    setAlerts,
    setThresholds,
  };
}