import { machineState } from "../models/machineState.js";

import {
  getMeasurementHistory,
  getMeasurementHistoryByPeriod,
} from "../services/historyService.js";

import {
  checkLineAlerts,
  checkTemperatureAlerts,
  checkFlowAlerts,
  checkTankAlerts,
} from "../services/alertService.js";

import { saveMeasurement } from "../services/measurementService.js";
import { saveAlerts } from "../services/alertHistoryService.js";

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getMachineId(value) {
  const machineId = Number(value);

  if (!Number.isInteger(machineId) || machineId <= 0) {
    return 1;
  }

  return machineId;
}

export function getMachineState(req, res) {
  res.json({
    success: true,
    data: machineState,
  });
}

export async function receiveMeasurements(req, res) {
  try {
    const data = req.body ?? {};

    const machineId = getMachineId(data.machineId);

    const allAlerts = [];
    const lines = ["L1", "L2", "L3"];

    /*
     * ===============================
     * MESURES ÉLECTRIQUES
     * ===============================
     */

    for (const lineName of lines) {
      const lineData = data.lines?.[lineName];

      if (!lineData) {
        machineState.lines[lineName] = {
          ...machineState.lines[lineName],
          status: "offline",
        };

        continue;
      }

      const normalizedLine = {
        voltage: toNumber(lineData.voltage),
        current: toNumber(lineData.current),
        power: toNumber(lineData.power),
        energy: toNumber(lineData.energy),
        frequency: toNumber(lineData.frequency),
        powerFactor: toNumber(
          lineData.powerFactor ?? lineData.pf
        ),
      };

      const result = checkLineAlerts(
        lineName,
        normalizedLine
      );

      machineState.lines[lineName] = {
        ...normalizedLine,
        status: result.status,
      };

      allAlerts.push(...result.alerts);
    }

    /*
     * ===============================
     * TEMPÉRATURE
     * ===============================
     */

    const temperatureValue = toNumber(
      data.temperature?.value ??
        data.temperature
    );

    const temperatureResult =
      checkTemperatureAlerts(temperatureValue);

    machineState.temperature = {
      value: temperatureValue,
      status: temperatureResult.status,
    };

    allAlerts.push(...temperatureResult.alerts);

    /*
     * ===============================
     * DÉBIT
     * ===============================
     */

    const flowValue = toNumber(
      data.flow?.value ??
        data.flow?.flowRate ??
        data.flowRate ??
        data.flow
    );

    const flowResult =
      checkFlowAlerts(flowValue);

    machineState.flow = {
      value: flowValue,
      status: flowResult.status,
    };

    allAlerts.push(...flowResult.alerts);

    /*
     * ===============================
     * RÉSERVOIR
     * ===============================
     */

    const tankData =
      data.tank ??
      data.reservoir ??
      {};

    const distanceCm = toNumber(
      tankData.distanceCm ??
        tankData.distance
    );

    const levelCm = toNumber(
      tankData.levelCm ??
        tankData.liquidHeightCm ??
        tankData.heightCm
    );

    const rawLevelPercent = toNumber(
      tankData.levelPercent ??
        tankData.percentage ??
        tankData.percent
    );

    const levelPercent = Math.min(
      100,
      Math.max(0, rawLevelPercent)
    );

    const volumeLiters = toNumber(
      tankData.volumeLiters ??
        tankData.volume ??
        tankData.liters
    );

    const tankResult = checkTankAlerts({
      distanceCm,
      levelCm,
      levelPercent,
      volumeLiters,
    });

    machineState.tank = {
      distanceCm,
      levelCm,
      levelPercent,
      volumeLiters,
      status: tankResult.status,
    };

    allAlerts.push(...tankResult.alerts);

    /*
     * ===============================
     * ÉTAT GLOBAL
     * ===============================
     */

    machineState.machineId = machineId;
    machineState.alerts = allAlerts;
    machineState.timestamp =
      new Date().toISOString();

    /*
     * ===============================
     * ENREGISTREMENT
     * ===============================
     */

    await saveAlerts(
      allAlerts,
      machineId
    );

    const measurementId =
      await saveMeasurement(
        machineState,
        machineId
      );

    /*
     * ===============================
     * SOCKET.IO
     * ===============================
     */

    const io = req.app.get("io");

    if (io) {
      io.emit("machine:update", {
        machineId,
        ...machineState,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Mesures reçues et enregistrées",
      machineId,
      measurementId,
      data: machineState,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la réception des mesures :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors du traitement ou de l’enregistrement des mesures",
      details: error.message,
    });
  }
}

export async function getHistory(req, res) {
  try {
    const limit = req.query.limit || 100;

    const machineId = req.query.machineId
      ? getMachineId(req.query.machineId)
      : null;

    const history =
      await getMeasurementHistory(
        limit,
        machineId
      );

    return res.json({
      success: true,
      machineId,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error(
      "Erreur récupération historique :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer l’historique",
      details: error.message,
    });
  }
}

export async function getHistoryByPeriod(req, res) {
  try {
    const period =
      req.query.period || "24h";

    const allowedPeriods = [
      "1h",
      "24h",
      "7d",
      "30d",
    ];

    if (!allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message:
          "Période invalide. Valeurs autorisées : 1h, 24h, 7d, 30d",
      });
    }

    const machineId = req.query.machineId
      ? getMachineId(req.query.machineId)
      : null;

    const history =
      await getMeasurementHistoryByPeriod(
        period,
        machineId
      );

    return res.json({
      success: true,
      machineId,
      period,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error(
      "Erreur récupération historique par période :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer l’historique demandé",
      details: error.message,
    });
  }
}
