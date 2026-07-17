import {
  getThresholds,
  saveThreshold,
  deleteThreshold,
} from "../services/thresholdService.js";

export async function getAllThresholds(req, res) {
  try {
    const thresholds = await getThresholds();

    res.json({
      success: true,
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
      message: "Impossible de récupérer les seuils",
      details: error.message,
    });
  }
}

export async function createOrUpdateThreshold(req, res) {
  try {
    const {
      source,
      parameterName,
      minimumValue,
      maximumValue,
      warningValue,
      criticalValue,
      unit,
    } = req.body;

    if (!source || !parameterName) {
      return res.status(400).json({
        success: false,
        message:
          "Les champs source et parameterName sont obligatoires",
      });
    }

    const threshold = await saveThreshold({
      source,
      parameterName,
      minimumValue:
        minimumValue === undefined ? null : Number(minimumValue),
      maximumValue:
        maximumValue === undefined ? null : Number(maximumValue),
      warningValue:
        warningValue === undefined ? null : Number(warningValue),
      criticalValue:
        criticalValue === undefined ? null : Number(criticalValue),
      unit: unit || null,
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
      message: "Impossible d’enregistrer le seuil",
      details: error.message,
    });
  }
}

export async function removeThreshold(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de seuil invalide",
      });
    }

    const deleted = await deleteThreshold(id);

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
      });
    }

    res.json({
      success: true,
      message: "Seuil supprimé",
    });
  } catch (error) {
    console.error(
      "Erreur suppression du seuil :",
      error
    );

    res.status(500).json({
      success: false,
      message: "Impossible de supprimer le seuil",
      details: error.message,
    });
  }
}