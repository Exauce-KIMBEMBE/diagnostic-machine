import {
  getThresholds,
  saveThreshold,
  deleteThreshold,
} from "../services/thresholdService.js";

function parseOptionalNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export async function getAllThresholds(req, res) {
  try {
    const machineId = req.query.machineId
      ? Number(req.query.machineId)
      : 1;

    if (
      !Number.isInteger(machineId) ||
      machineId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de machine invalide",
      });
    }

    const thresholds = await getThresholds(machineId);

    res.json({
      success: true,
      machineId,
      count: thresholds.length,
      data: thresholds,
    });
  } catch (error) {
    console.error(
      "Erreur récupération des seuils :",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les seuils",
      details: error.message,
    });
  }
}

export async function createOrUpdateThreshold(req, res) {
  try {
    const {
      machineId = 1,
      source,
      parameterName,
      minimumValue,
      maximumValue,
      warningValue,
      criticalValue,
      unit,
    } = req.body;

    const parsedMachineId = Number(machineId);

    if (
      !Number.isInteger(parsedMachineId) ||
      parsedMachineId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de machine invalide",
      });
    }

    if (!source || !parameterName) {
      return res.status(400).json({
        success: false,
        message:
          "Les champs source et parameterName sont obligatoires",
      });
    }

    const parsedMinimum =
      parseOptionalNumber(minimumValue);

    const parsedMaximum =
      parseOptionalNumber(maximumValue);

    const parsedWarning =
      parseOptionalNumber(warningValue);

    const parsedCritical =
      parseOptionalNumber(criticalValue);

    if (
      minimumValue !== undefined &&
      minimumValue !== null &&
      minimumValue !== "" &&
      parsedMinimum === null
    ) {
      return res.status(400).json({
        success: false,
        message: "minimumValue est invalide",
      });
    }

    if (
      maximumValue !== undefined &&
      maximumValue !== null &&
      maximumValue !== "" &&
      parsedMaximum === null
    ) {
      return res.status(400).json({
        success: false,
        message: "maximumValue est invalide",
      });
    }

    if (
      warningValue !== undefined &&
      warningValue !== null &&
      warningValue !== "" &&
      parsedWarning === null
    ) {
      return res.status(400).json({
        success: false,
        message: "warningValue est invalide",
      });
    }

    if (
      criticalValue !== undefined &&
      criticalValue !== null &&
      criticalValue !== "" &&
      parsedCritical === null
    ) {
      return res.status(400).json({
        success: false,
        message: "criticalValue est invalide",
      });
    }

    if (
      parsedMinimum !== null &&
      parsedMaximum !== null &&
      parsedMinimum > parsedMaximum
    ) {
      return res.status(400).json({
        success: false,
        message:
          "minimumValue ne peut pas être supérieur à maximumValue",
      });
    }

    const threshold = await saveThreshold({
      machineId: parsedMachineId,
      source: String(source).trim(),
      parameterName: String(parameterName).trim(),
      minimumValue: parsedMinimum,
      maximumValue: parsedMaximum,
      warningValue: parsedWarning,
      criticalValue: parsedCritical,
      unit: unit
        ? String(unit).trim()
        : null,
    });

    const io = req.app.get("io");

    if (io) {
      io.emit("threshold:update", threshold);
    }

    res.status(200).json({
      success: true,
      message: "Seuil enregistré",
      data: threshold,
    });
  } catch (error) {
    console.error(
      "Erreur enregistrement du seuil :",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Impossible d’enregistrer le seuil",
      details: error.message,
    });
  }
}

export async function removeThreshold(req, res) {
  try {
    const id = Number(req.params.id);

    const machineId = req.query.machineId
      ? Number(req.query.machineId)
      : 1;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de seuil invalide",
      });
    }

    if (
      !Number.isInteger(machineId) ||
      machineId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de machine invalide",
      });
    }

    const deleted = await deleteThreshold(
      id,
      machineId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Seuil introuvable",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("threshold:delete", {
        id,
        machineId,
      });
    }

    res.json({
      success: true,
      message: "Seuil supprimé",
      id,
      machineId,
    });
  } catch (error) {
    console.error(
      "Erreur suppression du seuil :",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Impossible de supprimer le seuil",
      details: error.message,
    });
  }
}
