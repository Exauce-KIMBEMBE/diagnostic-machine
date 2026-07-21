import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { io } from "socket.io-client";

import {
  API_URL,
  getMachineState,
  getHistoryByPeriod,
  getActiveAlerts,
  getThresholds,
} from "../services/api.js";

const createInitialLine = () => ({
  voltage: 0,
  current: 0,
  power: 0,
  energy: 0,
  frequency: 0,
  powerFactor: 0,
  status: "offline",
});

const initialState = {
  machineId: 1,
  timestamp: null,

  lines: {
    L1: createInitialLine(),
    L2: createInitialLine(),
    L3: createInitialLine(),
  },

  temperature: {
    value: 0,
    status: "offline",
  },

  flow: {
    value: 0,
    status: "offline",
  },

  tank: {
    distanceCm: 0,
    levelCm: 0,
    levelPercent: 0,
    volumeLiters: 0,
    status: "offline",
  },

  alerts: [],
};

function normalizeMachineState(response, machineId) {
  const data =
    response?.data?.data ??
    response?.data ??
    response;

  if (!data || typeof data !== "object") {
    return {
      ...initialState,
      machineId: Number(machineId) || 1,
    };
  }

  return {
    ...initialState,
    ...data,

    machineId:
      Number(data.machineId) ||
      Number(machineId) ||
      1,

    lines: {
      L1: {
        ...initialState.lines.L1,
        ...data.lines?.L1,
      },

      L2: {
        ...initialState.lines.L2,
        ...data.lines?.L2,
      },

      L3: {
        ...initialState.lines.L3,
        ...data.lines?.L3,
      },
    },

    temperature: {
      ...initialState.temperature,
      ...data.temperature,
    },

    flow: {
      ...initialState.flow,
      ...data.flow,
    },

    tank: {
      ...initialState.tank,
      ...data.tank,
    },

    alerts: Array.isArray(data.alerts)
      ? data.alerts
      : [],
  };
}

function extractArray(response) {
  const possibleData =
    response?.data?.data ??
    response?.data ??
    response;

  return Array.isArray(possibleData)
    ? possibleData
    : [];
}

export function useMachineData(machineId = 1) {
  const normalizedMachineId =
    Number(machineId) || 1;

  const [machine, setMachine] = useState({
    ...initialState,
    machineId: normalizedMachineId,
  });

  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] =
    useState([]);

  const [period, setPeriod] =
    useState("24h");

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDashboard = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const [
          machineResponse,
          historyResponse,
          alertsResponse,
          thresholdsResponse,
        ] = await Promise.all([
          getMachineState(
            normalizedMachineId
          ),

          getHistoryByPeriod({
            period,
            machineId:
              normalizedMachineId,
          }),

          getActiveAlerts(
            normalizedMachineId
          ),

          getThresholds(
            normalizedMachineId
          ),
        ]);

        setMachine(
          normalizeMachineState(
            machineResponse,
            normalizedMachineId
          )
        );

        setHistory(
          extractArray(historyResponse)
        );

        setAlerts(
          extractArray(alertsResponse)
        );

        setThresholds(
          extractArray(
            thresholdsResponse
          )
        );
      } catch (requestError) {
        console.error(
          "Erreur chargement du tableau de bord :",
          requestError
        );

        setError(
          requestError.response?.data
            ?.message ||
            requestError.message ||
            "Impossible de charger les données"
        );
      } finally {
        setLoading(false);
      }
    },
    [normalizedMachineId, period]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: [
        "websocket",
        "polling",
      ],

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on(
      "connect_error",
      (socketError) => {
        console.error(
          "Erreur Socket.IO :",
          socketError.message
        );

        setSocketConnected(false);
      }
    );

    socket.on(
      "machine:update",
      (receivedData) => {
        const receivedMachineId =
          Number(
            receivedData?.machineId
          ) || 1;

        if (
          receivedMachineId !==
          normalizedMachineId
        ) {
          return;
        }

        const normalizedMachine =
          normalizeMachineState(
            receivedData,
            normalizedMachineId
          );

        setMachine(normalizedMachine);

        setHistory(
          (previousHistory) => {
            const lines =
              normalizedMachine.lines;

            const tank =
              normalizedMachine.tank;

            const newHistoryItem = {
              machine_id:
                receivedMachineId,

              l1_voltage:
                lines.L1.voltage,
              l1_current:
                lines.L1.current,
              l1_power:
                lines.L1.power,
              l1_energy:
                lines.L1.energy,
              l1_frequency:
                lines.L1.frequency,
              l1_power_factor:
                lines.L1.powerFactor,

              l2_voltage:
                lines.L2.voltage,
              l2_current:
                lines.L2.current,
              l2_power:
                lines.L2.power,
              l2_energy:
                lines.L2.energy,
              l2_frequency:
                lines.L2.frequency,
              l2_power_factor:
                lines.L2.powerFactor,

              l3_voltage:
                lines.L3.voltage,
              l3_current:
                lines.L3.current,
              l3_power:
                lines.L3.power,
              l3_energy:
                lines.L3.energy,
              l3_frequency:
                lines.L3.frequency,
              l3_power_factor:
                lines.L3.powerFactor,

              temperature:
                normalizedMachine
                  .temperature.value,

              flow_rate:
                normalizedMachine.flow
                  .value,

              tank_distance_cm:
                tank.distanceCm,

              tank_level_cm:
                tank.levelCm,

              tank_level_percent:
                tank.levelPercent,

              tank_volume_liters:
                tank.volumeLiters,

              created_at:
                normalizedMachine.timestamp ??
                new Date().toISOString(),
            };

            return [
              ...previousHistory,
              newHistoryItem,
            ].slice(-1000);
          }
        );

        setAlerts(
          Array.isArray(
            normalizedMachine.alerts
          )
            ? normalizedMachine.alerts
            : []
        );
      }
    );

    socket.on(
      "alert:acknowledged",
      ({ id }) => {
        setAlerts(
          (previousAlerts) =>
            previousAlerts.filter(
              (alert) =>
                Number(alert.id) !==
                Number(id)
            )
        );
      }
    );

    socket.on(
      "threshold:update",
      (threshold) => {
        if (
          Number(
            threshold?.machine_id ??
              threshold?.machineId ??
              normalizedMachineId
          ) !== normalizedMachineId
        ) {
          return;
        }

        setThresholds(
          (previousThresholds) => {
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

            return previousThresholds.map(
              (item) =>
                Number(item.id) ===
                Number(threshold.id)
                  ? threshold
                  : item
            );
          }
        );
      }
    );

    socket.on(
      "threshold:delete",
      ({ id, machineId: deletedMachineId }) => {
        if (
          deletedMachineId &&
          Number(deletedMachineId) !==
            normalizedMachineId
        ) {
          return;
        }

        setThresholds(
          (previousThresholds) =>
            previousThresholds.filter(
              (item) =>
                Number(item.id) !==
                Number(id)
            )
        );
      }
    );

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [normalizedMachineId]);

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

    setMachine,
    setHistory,
    setAlerts,
    setThresholds,
  };
}
