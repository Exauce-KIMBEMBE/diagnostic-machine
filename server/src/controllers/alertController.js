import {
  getAlerts,
  getActiveAlerts,
  acknowledgeAlert,
} from "../services/alertHistoryService.js";

//======================================================
// TOUTES LES ALERTES
//======================================================

export async function getAllAlerts(
  req,
  res
) {
  try {
    const limit =
      Number(
        req.query.limit || 100
      );

    const machineId =
      Number(
        req.machineId
      );

    if (
      !Number.isInteger(machineId) ||
      machineId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Identifiant machine invalide",
        });
    }

    const safeLimit =
      Number.isInteger(limit) &&
      limit > 0
        ? Math.min(limit, 500)
        : 100;

    const alerts =
      await getAlerts(
        safeLimit,
        machineId
      );

    return res.json({
      success: true,
      machineId,
      count:
        alerts.length,
      data:
        alerts,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur récupération des alertes :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Impossible de récupérer les alertes",
        details:
          error.message,
      });
  }
}

//======================================================
// ALERTES ACTIVES
//======================================================

export async function getCurrentAlerts(
  req,
  res
) {
  try {
    const machineId =
      Number(
        req.machineId
      );

    if (
      !Number.isInteger(machineId) ||
      machineId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Identifiant machine invalide",
        });
    }

    const alerts =
      await getActiveAlerts(
        machineId
      );

    return res.json({
      success: true,
      machineId,
      count:
        alerts.length,
      data:
        alerts,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur récupération des alertes actives :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Impossible de récupérer les alertes actives",
        details:
          error.message,
      });
  }
}

//======================================================
// ACQUITTER UNE ALERTE
//======================================================

export async function acknowledge(
  req,
  res
) {
  try {
    const alertId =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        alertId
      ) ||
      alertId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Identifiant d’alerte invalide",
        });
    }

    const acknowledged =
      await acknowledgeAlert(
        alertId
      );

    if (
      !acknowledged
    ) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Alerte introuvable",
        });
    }

    const io =
      req.app.get("io");

    if (io) {
      io.emit(
        "alert:acknowledged",
        {
          id:
            alertId,
        }
      );
    }

    return res.json({
      success: true,
      message:
        "Alerte acquittée",
      alertId,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur acquittement de l’alerte :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Impossible d’acquitter l’alerte",
        details:
          error.message,
      });
  }
}
