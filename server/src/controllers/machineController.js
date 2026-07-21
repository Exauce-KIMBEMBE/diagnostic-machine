import { machineState } from "../models/machineState.js";

import {
  getMeasurementHistory,
  getMeasurementHistoryByPeriod,
} from "../services/historyService.js";

import {
  checkLineAlerts,
  checkTemperatureAlerts,
  checkFlowAlerts,
} from "../services/alertService.js";

import { saveMeasurement } from "../services/measurementService.js";
import { saveAlerts } from "../services/alertHistoryService.js";

/*
 * Convertit une valeur en nombre.
 * Retourne 0 si la valeur est absente ou invalide.
 */
function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

export function getMachineState(req, res) {
  res.json(machineState);
}

export async function receiveMeasurements(req, res) {
  try {
    const data = req.body;

    const machineId = Number(data.machineId) || 1;

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
     * NIVEAU DU RÉSERVOIR
     * ===============================
     *
     * Le contrôleur accepte aussi bien :
     *
     * data.tank
     * data.reservoir
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

    const volumeLiters = toNumber(
      tankData.volumeLiters ??
        tankData.volume ??
        tankData.liters
    );

    const levelPercent = Math.min(
      100,
      Math.max(0, rawLevelPercent)
    );

    let tankStatus = "normal";

    if (levelPercent <= 10) {
      tankStatus = "critical";
    } else if (levelPercent <= 20) {
      tankStatus = "warning";
    } else if (levelPercent >= 98) {
      tankStatus = "critical";
    } else if (levelPercent >= 90) {
      tankStatus = "warning";
    }

    machineState.tank = {
      distanceCm,
      levelCm,
      levelPercent,
      volumeLiters,
      status: tankStatus,
    };

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

    res.status(201).json({
      success: true,
      message:
        "Mesures reçues et enregistrées",
      machineId,
      measurementId,
      data: machineState,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la réception des mesures :",
      error
    );

    res.status(500).json({
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

    const history =
      await getMeasurementHistory(limit);

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error(
      "Erreur récupération historique :",
      error
    );

    res.status(500).json({
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

    const history =
      await getMeasurementHistoryByPeriod(
        period
      );

    res.json({
      success: true,
      period,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error(
      "Erreur récupération historique par période :",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer l’historique demandé",
      details: error.message,
    });
  }
}
