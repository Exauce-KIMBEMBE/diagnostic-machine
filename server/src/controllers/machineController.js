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

export function getMachineState(req, res) {
  res.json(machineState);
}

export async function receiveMeasurements(req, res) {
  try {
    const data = req.body;

    const machineId = Number(data.machineId) || 1;

    const allAlerts = [];
    const lines = ["L1", "L2", "L3"];

    for (const lineName of lines) {
      const lineData = data.lines?.[lineName];

      if (!lineData) {
        continue;
      }

      const normalizedLine = {
        voltage: Number(lineData.voltage) || 0,
        current: Number(lineData.current) || 0,
        power: Number(lineData.power) || 0,
        energy: Number(lineData.energy) || 0,
        frequency: Number(lineData.frequency) || 0,
        powerFactor:
          Number(lineData.powerFactor ?? lineData.pf) || 0,
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

    const temperatureValue =
      Number(data.temperature?.value ?? data.temperature) || 0;

    const flowValue =
      Number(data.flow?.value ?? data.flow) || 0;

    const temperatureResult =
      checkTemperatureAlerts(temperatureValue);

    const flowResult =
      checkFlowAlerts(flowValue);

    machineState.temperature = {
      value: temperatureValue,
      status: temperatureResult.status,
    };

    machineState.flow = {
      value: flowValue,
      status: flowResult.status,
    };

    allAlerts.push(
      ...temperatureResult.alerts,
      ...flowResult.alerts
    );

    machineState.machineId = machineId;
    machineState.alerts = allAlerts;
    machineState.timestamp = new Date().toISOString();

    await saveAlerts(
      allAlerts,
      machineId
    );

    const measurementId =
      await saveMeasurement(
        machineState,
        machineId
      );

    const io = req.app.get("io");

    if (io) {
      io.emit("machine:update", {
        machineId,
        ...machineState,
      });
    }

    res.status(201).json({
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
    const period = req.query.period || "24h";

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
      await getMeasurementHistoryByPeriod(period);

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