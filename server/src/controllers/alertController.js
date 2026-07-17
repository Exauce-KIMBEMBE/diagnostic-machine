import {
  getAlerts,
  getActiveAlerts,
  acknowledgeAlert,
} from "../services/alertHistoryService.js";

export async function getAllAlerts(req, res) {
  try {
    const limit = req.query.limit || 100;

    const machineId = req.query.machineId
      ? Number(req.query.machineId)
      : null;

    const alerts = await getAlerts(
      limit,
      machineId
    );

    res.json({
      success: true,
      machineId,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error(
      "Erreur récupération des alertes :",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les alertes",
      details: error.message,
    });
  }
}

export async function getCurrentAlerts(req, res) {
  try {
    const machineId = req.query.machineId
      ? Number(req.query.machineId)
      : null;

    const alerts = await getActiveAlerts(
      machineId
    );

    res.json({
      success: true,
      machineId,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error(
      "Erreur récupération des alertes actives :",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les alertes actives",
      details: error.message,
    });
  }
}

export async function acknowledge(req, res) {
  try {
    const alertId = Number(req.params.id);

    if (!Number.isInteger(alertId) || alertId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant d’alerte invalide",
      });
    }

    const acknowledged =
      await acknowledgeAlert(alertId);

    if (!acknowledged) {
      return res.status(404).json({
        success: false,
        message: "Alerte introuvable",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("alert:acknowledged", {
        id: alertId,
      });
    }

    res.json({
      success: true,
      message: "Alerte acquittée",
      alertId,
    });
  } catch (error) {
    console.error(
      "Erreur acquittement de l’alerte :",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Impossible d’acquitter l’alerte",
      details: error.message,
    });
  }
}