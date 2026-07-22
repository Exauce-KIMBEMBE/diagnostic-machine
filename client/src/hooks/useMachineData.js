import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { io } from "socket.io-client";

import {
  API_URL,
  SOCKET_URL,
} from "../config/defaults.js";

import {
  getMachineState,
  getHistoryByPeriod,
  getActiveAlerts,
  getThresholds,
} from "../services/api.js";

const MACHINE_OFFLINE_DELAY = 30000;

const createInitialLine = () => ({
  voltage: 0,
  current: 0,
  power: 0,
  apparentPower: 0,
  reactivePower: 0,
  energy: 0,
  frequency: 0,
  powerFactor: 0,
  status: "offline",
});

function createInitialState(machineId = 1) {
  return {
    id: Number(machineId) || 1,
    machineId: Number(machineId) || 1,
    machineName: "",
    name: "",
    timestamp: null,
    status: "offline",
    online: false,

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
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizeStatus(
  status,
  fallback = "offline"
) {
  const normalizedStatus = String(
    status ?? fallback
  ).toLowerCase();

  const allowedStatuses = [
    "online",
    "connected",
    "active",
    "normal",
    "warning",
    "critical",
    "offline",
    "disconnected",
    "error",
  ];

  return allowedStatuses.includes(
    normalizedStatus
  )
    ? normalizedStatus
    : fallback;
}

function normalizeLine(line = {}) {
  const voltage = toNumber(
    line.voltage ??
      line.voltageValue ??
      line.voltage_value
  );

  const current = toNumber(
    line.current ??
      line.currentValue ??
      line.current_value
  );

  const power = toNumber(
    line.power ??
      line.activePower ??
      line.active_power
  );

  const rawPowerFactor = toNumber(
    line.powerFactor ??
      line.power_factor ??
      line.pf
  );

  const calculatedApparentPower =
    voltage * current;

  const apparentPower = toNumber(
    line.apparentPower ??
      line.apparent_power,
    calculatedApparentPower
  );

  const calculatedReactivePower =
    Math.sqrt(
      Math.max(
        apparentPower ** 2 -
          power ** 2,
        0
      )
    );

  const reactivePower = toNumber(
    line.reactivePower ??
      line.reactive_power,
    calculatedReactivePower
  );

  const powerFactor =
    rawPowerFactor ||
    (
      apparentPower > 0
        ? power / apparentPower
        : 0
    );

  return {
    voltage,
    current,
    power,
    apparentPower,
    reactivePower,

    energy: toNumber(
      line.energy ??
        line.energyKwh ??
        line.energy_kwh
    ),

    frequency: toNumber(
      line.frequency ??
        line.frequencyHz ??
        line.frequency_hz
    ),

    powerFactor,

    status: normalizeStatus(
      line.status,
      "offline"
    ),
  };
}

function unwrapResponse(response) {
  return (
    response?.data?.data ??
    response?.data ??
    response
  );
}

function normalizeMachineState(
  response,
  machineId
) {
  const data =
    unwrapResponse(response);

  const normalizedMachineId =
    Number(
      data?.machineId ??
        data?.machine_id ??
        data?.id ??
        machineId
    ) || 1;

  const initialState =
    createInitialState(
      normalizedMachineId
    );

  if (
    !data ||
    typeof data !== "object"
  ) {
    return initialState;
  }

  const machineName =
    data.machineName ??
    data.machine_name ??
    data.name ??
    "";

  const rawStatus =
    data.status ??
    data.connectionStatus ??
    data.connection_status;

  const normalizedStatus =
    normalizeStatus(
      rawStatus,
      "offline"
    );

  const online =
    data.online === true ||
    [
      "online",
      "connected",
      "active",
    ].includes(normalizedStatus);

  return {
    ...initialState,
    ...data,

    id: normalizedMachineId,
    machineId:
      normalizedMachineId,

    machineName,
    name: machineName,

    status: online
      ? "online"
      : normalizedStatus,

    online,

    timestamp:
      data.timestamp ??
      data.created_at ??
      data.updated_at ??
      null,

    lines: {
      L1: normalizeLine(
        data.lines?.L1 ??
          data.lines?.l1 ??
          data.L1 ??
          data.l1
      ),

      L2: normalizeLine(
        data.lines?.L2 ??
          data.lines?.l2 ??
          data.L2 ??
          data.l2
      ),

      L3: normalizeLine(
        data.lines?.L3 ??
          data.lines?.l3 ??
          data.L3 ??
          data.l3
      ),
    },

    temperature: {
      value: toNumber(
        data.temperature?.value ??
          data.temperature?.temperature ??
          data.temperature
      ),

      status: normalizeStatus(
        data.temperature?.status ??
          data.temperatureStatus ??
          data.temperature_status,
        online
          ? "normal"
          : "offline"
      ),
    },

    flow: {
      value: toNumber(
        data.flow?.value ??
          data.flow?.flowRate ??
          data.flow?.flow_rate ??
          data.flow
      ),

      status: normalizeStatus(
        data.flow?.status ??
          data.flowStatus ??
          data.flow_status,
        online
          ? "normal"
          : "offline"
      ),
    },

    tank: {
      distanceCm: toNumber(
        data.tank?.distanceCm ??
          data.tank?.distance_cm ??
          data.tank_distance_cm
      ),

      levelCm: toNumber(
        data.tank?.levelCm ??
          data.tank?.level_cm ??
          data.tank_level_cm
      ),

      levelPercent: toNumber(
        data.tank?.levelPercent ??
          data.tank?.level_percent ??
          data.tank_level_percent
      ),

      volumeLiters: toNumber(
        data.tank?.volumeLiters ??
          data.tank?.volume_liters ??
          data.tank_volume_liters
      ),

      status: normalizeStatus(
        data.tank?.status ??
          data.tankStatus ??
          data.tank_status,
        online
          ? "normal"
          : "offline"
      ),
    },

    alerts: Array.isArray(
      data.alerts
    )
      ? data.alerts
      : [],
  };
}

function extractArray(response) {
  const data =
    unwrapResponse(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(data?.items)
  ) {
    return data.items;
  }

  if (
    Array.isArray(data?.results)
  ) {
    return data.results;
  }

  return [];
}

function createHistoryItem(machine) {
  const lines = machine.lines;
  const tank = machine.tank;

  return {
    machine_id:
      machine.machineId,

    l1_voltage:
      lines.L1.voltage,
    l1_current:
      lines.L1.current,
    l1_power:
      lines.L1.power,
    l1_apparent_power:
      lines.L1.apparentPower,
    l1_reactive_power:
      lines.L1.reactivePower,
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
    l2_apparent_power:
      lines.L2.apparentPower,
    l2_reactive_power:
      lines.L2.reactivePower,
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
    l3_apparent_power:
      lines.L3.apparentPower,
    l3_reactive_power:
      lines.L3.reactivePower,
    l3_energy:
      lines.L3.energy,
    l3_frequency:
      lines.L3.frequency,
    l3_power_factor:
      lines.L3.powerFactor,

    temperature:
      machine.temperature.value,

    flow_rate:
      machine.flow.value,

    tank_distance_cm:
      tank.distanceCm,

    tank_level_cm:
      tank.levelCm,

    tank_level_percent:
      tank.levelPercent,

    tank_volume_liters:
      tank.volumeLiters,

    created_at:
      machine.timestamp ??
      new Date().toISOString(),
  };
}

export function useMachineData(
  machineId = 1
) {
  const normalizedMachineId =
    useMemo(
      () =>
        Number(machineId) || 1,
      [machineId]
    );

  const offlineTimerRef =
    useRef(null);

  const databaseLoadedRef =
    useRef(false);

  const [machine, setMachine] =
    useState(() =>
      createInitialState(
        normalizedMachineId
      )
    );

  const [
    machineOnline,
    setMachineOnline,
  ] = useState(false);

  const [history, setHistory] =
    useState([]);

  const [alerts, setAlerts] =
    useState([]);

  const [
    thresholds,
    setThresholds,
  ] = useState([]);

  const [period, setPeriod] =
    useState("24h");

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const clearOfflineTimer =
    useCallback(() => {
      if (
        offlineTimerRef.current
      ) {
        clearTimeout(
          offlineTimerRef.current
        );

        offlineTimerRef.current =
          null;
      }
    }, []);

  const markMachineOffline =
    useCallback(() => {
      clearOfflineTimer();

      setMachineOnline(false);

      setMachine(
        createInitialState(
          normalizedMachineId
        )
      );

      setHistory([]);
      setAlerts([]);
      setThresholds([]);
      setError("");

      databaseLoadedRef.current =
        false;
    }, [
      clearOfflineTimer,
      normalizedMachineId,
    ]);

  const restartOfflineTimer =
    useCallback(() => {
      clearOfflineTimer();

      offlineTimerRef.current =
        setTimeout(
          () => {
            markMachineOffline();
          },
          MACHINE_OFFLINE_DELAY
        );
    }, [
      clearOfflineTimer,
      markMachineOffline,
    ]);

  const loadDashboard =
    useCallback(async () => {
      if (!machineOnline) {
        setLoading(false);
        setError("");

        return;
      }

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

        const normalizedMachine =
          normalizeMachineState(
            machineResponse,
            normalizedMachineId
          );

        setMachine({
          ...normalizedMachine,
          online: true,
          status: "online",
        });

        setHistory(
          extractArray(
            historyResponse
          )
        );

        setAlerts(
          extractArray(
            alertsResponse
          )
        );

        setThresholds(
          extractArray(
            thresholdsResponse
          )
        );

        databaseLoadedRef.current =
          true;
      } catch (requestError) {
        console.error(
          "Erreur chargement du tableau de bord :",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ??
            requestError?.message ??
            "Impossible de charger les données"
        );
      } finally {
        setLoading(false);
      }
    }, [
      machineOnline,
      normalizedMachineId,
      period,
    ]);

  useEffect(() => {
    clearOfflineTimer();

    setMachine(
      createInitialState(
        normalizedMachineId
      )
    );

    setMachineOnline(false);
    setHistory([]);
    setAlerts([]);
    setThresholds([]);
    setError("");
    setLoading(false);

    databaseLoadedRef.current =
      false;
  }, [
    clearOfflineTimer,
    normalizedMachineId,
  ]);

  useEffect(() => {
    if (
      !machineOnline ||
      databaseLoadedRef.current
    ) {
      return;
    }

    loadDashboard();
  }, [
    loadDashboard,
    machineOnline,
  ]);

  useEffect(() => {
    if (
      !machineOnline ||
      !databaseLoadedRef.current
    ) {
      return;
    }

    loadDashboard();
  }, [
    loadDashboard,
    machineOnline,
    period,
  ]);

  useEffect(() => {
    const socket = io(
      SOCKET_URL || API_URL,
      {
        transports: [
          "websocket",
          "polling",
        ],

        reconnection: true,

        reconnectionAttempts:
          Infinity,

        reconnectionDelay: 1000,
      }
    );

    socket.on("connect", () => {
      setSocketConnected(true);

      socket.emit(
        "machine:join",
        {
          machineId:
            normalizedMachineId,
        }
      );
    });

    socket.on(
      "disconnect",
      () => {
        setSocketConnected(false);
        markMachineOffline();
      }
    );

    socket.on(
      "connect_error",
      (socketError) => {
        console.error(
          "Erreur Socket.IO :",
          socketError.message
        );

        setSocketConnected(false);
        markMachineOffline();
      }
    );

    socket.on(
      "machine:online",
      (payload = {}) => {
        const receivedMachineId =
          Number(
            payload.machineId ??
              payload.machine_id ??
              normalizedMachineId
          );

        if (
          receivedMachineId !==
          normalizedMachineId
        ) {
          return;
        }

        setMachineOnline(true);

        setMachine(
          (previousMachine) => ({
            ...previousMachine,
            id:
              normalizedMachineId,
            machineId:
              normalizedMachineId,
            status: "online",
            online: true,
            timestamp:
              payload.timestamp ??
              previousMachine.timestamp ??
              new Date().toISOString(),
          })
        );

        restartOfflineTimer();
      }
    );

    socket.on(
      "machine:offline",
      (payload = {}) => {
        const receivedMachineId =
          Number(
            payload.machineId ??
              payload.machine_id ??
              normalizedMachineId
          );

        if (
          receivedMachineId !==
          normalizedMachineId
        ) {
          return;
        }

        markMachineOffline();
      }
    );

    socket.on(
      "machine:update",
      (receivedData) => {
        const receivedMachineId =
          Number(
            receivedData?.machineId ??
              receivedData?.machine_id ??
              receivedData?.id
          ) || 1;

        if (
          receivedMachineId !==
          normalizedMachineId
        ) {
          return;
        }

        const normalizedMachine = {
          ...normalizeMachineState(
            receivedData,
            normalizedMachineId
          ),
          id:
            normalizedMachineId,
          machineId:
            normalizedMachineId,
          online: true,
          status: "online",
          timestamp:
            receivedData?.timestamp ??
            receivedData?.created_at ??
            receivedData?.updated_at ??
            new Date().toISOString(),
        };

        setMachineOnline(true);
        setMachine(
          normalizedMachine
        );

        restartOfflineTimer();

        setHistory(
          (previousHistory) => [
            ...previousHistory,
            createHistoryItem(
              normalizedMachine
            ),
          ].slice(-1000)
        );

        if (
          Array.isArray(
            normalizedMachine.alerts
          )
        ) {
          setAlerts(
            normalizedMachine.alerts
          );
        }
      }
    );

    socket.on(
      "alert:new",
      (alert) => {
        if (!machineOnline) {
          return;
        }

        const alertMachineId =
          Number(
            alert?.machineId ??
              alert?.machine_id ??
              normalizedMachineId
          );

        if (
          alertMachineId !==
          normalizedMachineId
        ) {
          return;
        }

        setAlerts(
          (previousAlerts) => {
            const exists =
              previousAlerts.some(
                (item) =>
                  Number(item.id) ===
                  Number(alert.id)
              );

            if (exists) {
              return previousAlerts.map(
                (item) =>
                  Number(item.id) ===
                  Number(alert.id)
                    ? alert
                    : item
              );
            }

            return [
              alert,
              ...previousAlerts,
            ];
          }
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
        if (!machineOnline) {
          return;
        }

        const thresholdMachineId =
          Number(
            threshold?.machine_id ??
              threshold?.machineId ??
              normalizedMachineId
          );

        if (
          thresholdMachineId !==
          normalizedMachineId
        ) {
          return;
        }

        setThresholds(
          (previousThresholds) => {
            const existing =
              previousThresholds.some(
                (item) =>
                  Number(item.id) ===
                  Number(threshold.id)
              );

            if (!existing) {
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
      ({
        id,
        machineId:
          deletedMachineId,
        machine_id:
          deletedMachineIdSnake,
      }) => {
        if (!machineOnline) {
          return;
        }

        const targetMachineId =
          deletedMachineId ??
          deletedMachineIdSnake;

        if (
          targetMachineId &&
          Number(
            targetMachineId
          ) !== normalizedMachineId
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
      clearOfflineTimer();

      socket.emit(
        "machine:leave",
        {
          machineId:
            normalizedMachineId,
        }
      );

      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [
    clearOfflineTimer,
    machineOnline,
    markMachineOffline,
    normalizedMachineId,
    restartOfflineTimer,
  ]);

  return {
    machine,
    machineOnline,

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

