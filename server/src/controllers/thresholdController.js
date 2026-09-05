import {
  getThresholds,
  saveThreshold,
  deleteThreshold,
} from "../services/thresholdService.js";

//======================================================
// OUTILS
//======================================================

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

//======================================================
// VALIDATION MACHINE
//======================================================

function parseMachineId(value) {
  const machineId = Number(value);

  if (
    !Number.isInteger(machineId) ||
    machineId <= 0
  ) {
    return null;
  }

  return machineId;
}

//======================================================
// RÉCUPÉRER LES SEUILS
//======================================================

export async function getAllThresholds(req, res) {
  try {
    /*
     * requireMachineAccess a déjà :
     *
     * - vérifié le JWT
     * - vérifié le rôle
     * - vérifié que le client possède la machine
     * - placé l'identifiant dans req.machineId
     */

    const machineId =
      parseMachineId(req.machineId);

    if (!machineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de machine invalide",
      });
    }

    const thresholds =
      await getThresholds(machineId);

    return res.json({
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

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les seuils",
      details: error.message,
    });
  }
}

//======================================================
// CRÉER OU MODIFIER UN SEUIL
//======================================================

export async function createOrUpdateThreshold(
  req,
  res
) {
  try {
    const {
      machineId,
      source,
      parameterName,
      minimumValue,
      maximumValue,
      warningValue,
      criticalValue,
      unit,
    } = req.body;

    //==================================================
    // MACHINE
    //==================================================

    /*
     * Cette route est réservée au manager.
     *
     * Le manager doit explicitement préciser
     * la machine à modifier.
     *
     * On ne met volontairement PAS
     * machineId = 1 par défaut.
     */

    const parsedMachineId =
      parseMachineId(machineId);

    if (!parsedMachineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de machine invalide",
      });
    }

    //==================================================
    // SOURCE / PARAMÈTRE
    //==================================================

    const parsedSource =
      String(source ?? "").trim();

    const parsedParameterName =
      String(parameterName ?? "").trim();

    if (
      !parsedSource ||
      !parsedParameterName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Les champs source et parameterName sont obligatoires",
      });
    }

    //==================================================
    // VALEURS
    //==================================================

    const parsedMinimum =
      parseOptionalNumber(
        minimumValue
      );

    const parsedMaximum =
      parseOptionalNumber(
        maximumValue
      );

    const parsedWarning =
      parseOptionalNumber(
        warningValue
      );

    const parsedCritical =
      parseOptionalNumber(
        criticalValue
      );

    //==================================================
    // VALIDATION MINIMUM
    //==================================================

    if (
      minimumValue !== undefined &&
      minimumValue !== null &&
      minimumValue !== "" &&
      parsedMinimum === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "minimumValue est invalide",
      });
    }

    //==================================================
    // VALIDATION MAXIMUM
    //==================================================

    if (
      maximumValue !== undefined &&
      maximumValue !== null &&
      maximumValue !== "" &&
      parsedMaximum === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "maximumValue est invalide",
      });
    }

    //==================================================
    // VALIDATION WARNING
    //==================================================

    if (
      warningValue !== undefined &&
      warningValue !== null &&
      warningValue !== "" &&
      parsedWarning === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "warningValue est invalide",
      });
    }

    //==================================================
    // VALIDATION CRITICAL
    //==================================================

    if (
      criticalValue !== undefined &&
      criticalValue !== null &&
      criticalValue !== "" &&
      parsedCritical === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "criticalValue est invalide",
      });
    }

    //==================================================
    // COHÉRENCE MIN / MAX
    //==================================================

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

    //==================================================
    // UNITÉ
    //==================================================

    const parsedUnit =
      unit !== undefined &&
      unit !== null &&
      String(unit).trim() !== ""
        ? String(unit).trim()
        : null;

    //==================================================
    // ENREGISTREMENT
    //==================================================

    const threshold =
      await saveThreshold({
        machineId:
          parsedMachineId,

        source:
          parsedSource,

        parameterName:
          parsedParameterName,

        minimumValue:
          parsedMinimum,

        maximumValue:
          parsedMaximum,

        warningValue:
          parsedWarning,

        criticalValue:
          parsedCritical,

        unit:
          parsedUnit,
      });

    //==================================================
    // SOCKET.IO
    //==================================================

    const io =
      req.app.get("io");

    if (io) {
      /*
       * On garde l'événement actuel pour
       * compatibilité avec le Dashboard.
       *
       * Lors de la sécurisation finale
       * de Socket.IO, nous limiterons
       * cet événement à la room machine.
       */

      io.emit(
        "threshold:update",
        threshold
      );
    }

    //==================================================
    // RÉPONSE
    //==================================================

    return res.status(200).json({
      success: true,
      message:
        "Seuil enregistré",
      machineId:
        parsedMachineId,
      data:
        threshold,
    });
  } catch (error) {
    console.error(
      "Erreur enregistrement du seuil :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible d’enregistrer le seuil",
      details: error.message,
    });
  }
}

//======================================================
// SUPPRIMER UN SEUIL
//======================================================

export async function removeThreshold(
  req,
  res
) {
  try {
    //==================================================
    // IDENTIFIANT DU SEUIL
    //==================================================

    const id =
      Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de seuil invalide",
      });
    }

    //==================================================
    // MACHINE
    //==================================================

    /*
     * DELETE est réservé au manager.
     *
     * La machine doit être explicitement
     * indiquée :
     *
     * DELETE /api/thresholds/5?machineId=2
     */

    const machineId =
      parseMachineId(
        req.query.machineId
      );

    if (!machineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de machine invalide",
      });
    }

    //==================================================
    // SUPPRESSION
    //==================================================

    const deleted =
      await deleteThreshold(
        id,
        machineId
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Seuil introuvable",
      });
    }

    //==================================================
    // SOCKET.IO
    //==================================================

    const io =
      req.app.get("io");

    if (io) {
      io.emit(
        "threshold:delete",
        {
          id,
          machineId,
        }
      );
    }

    //==================================================
    // RÉPONSE
    //==================================================

    return res.json({
      success: true,
      message:
        "Seuil supprimé",
      id,
      machineId,
    });
  } catch (error) {
    console.error(
      "Erreur suppression du seuil :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de supprimer le seuil",
      details: error.message,
    });
  }
}
