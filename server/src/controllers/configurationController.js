import {
  getMachineConfiguration,
  saveMachineConfiguration,
} from "../services/configurationService.js";

//======================================================
// VALIDATION MACHINE
//======================================================

function parseMachineId(value) {
  const machineId =
    Number(value);

  if (
    !Number.isInteger(machineId) ||
    machineId <= 0
  ) {
    return null;
  }

  return machineId;
}

//======================================================
// RÉCUPÉRER LA CONFIGURATION
//======================================================

export async function getConfiguration(
  req,
  res,
  next
) {
  try {
    /*
     * requireMachineAccess a déjà validé :
     *
     * - le JWT
     * - le rôle
     * - l'accès du client à la machine
     *
     * Il place ensuite l'identifiant
     * validé dans req.machineId.
     */

    const machineId =
      parseMachineId(
        req.machineId
      );

    if (!machineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de machine invalide",
      });
    }

    const configuration =
      await getMachineConfiguration(
        machineId
      );

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message:
          "Configuration introuvable",
      });
    }

    return res.json({
      success: true,
      machineId,
      configuration,
    });
  } catch (error) {
    return next(error);
  }
}

//======================================================
// MODIFIER LA CONFIGURATION
//======================================================

export async function updateConfiguration(
  req,
  res,
  next
) {
  try {
    /*
     * Cette route est réservée
     * au manager.
     *
     * L'identifiant de la machine
     * doit être explicitement fourni
     * dans l'URL :
     *
     * PUT /api/configuration/1
     */

    const machineId =
      parseMachineId(
        req.params.machineId
      );

    if (!machineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de machine invalide",
      });
    }

    //==================================================
    // HAUTEUR DU RÉSERVOIR
    //==================================================

    const reservoirHeightCm =
      Number(
        req.body?.reservoirHeightCm
      );

    if (
      !Number.isFinite(
        reservoirHeightCm
      ) ||
      reservoirHeightCm <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "reservoirHeightCm doit être supérieur à 0",
      });
    }

    //==================================================
    // CAPACITÉ DU RÉSERVOIR
    //==================================================

    const reservoirCapacityLiters =
      Number(
        req.body?.reservoirCapacityLiters
      );

    if (
      !Number.isFinite(
        reservoirCapacityLiters
      ) ||
      reservoirCapacityLiters <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "reservoirCapacityLiters doit être supérieur à 0",
      });
    }

    //==================================================
    // DONNÉES À ENREGISTRER
    //==================================================

    /*
     * On construit nous-mêmes l'objet
     * transmis au service.
     *
     * Cela évite de lui envoyer
     * directement tout req.body.
     */

    const configurationData = {
      ...req.body,

      reservoirHeightCm,
      reservoirCapacityLiters,
    };

    //==================================================
    // ENREGISTREMENT
    //==================================================

    const configuration =
      await saveMachineConfiguration(
        machineId,
        configurationData
      );

    if (!configuration) {
      return res.status(500).json({
        success: false,
        message:
          "Impossible de récupérer la configuration après mise à jour",
      });
    }

    //==================================================
    // SOCKET.IO
    //==================================================

    const io =
      req.app.get("io");

    if (io) {
      /*
       * On conserve l'événement actuel.
       *
       * Lors de la sécurisation finale
       * de Socket.IO, on l'enverra
       * uniquement dans la room
       * de cette machine.
       */

      io.emit(
        "configuration:update",
        {
          machineId,
          configuration,
        }
      );
    }

    //==================================================
    // RÉPONSE
    //==================================================

    return res.json({
      success: true,
      message:
        "Configuration mise à jour",
      machineId,
      configuration,
    });
  } catch (error) {
    return next(error);
  }
}
