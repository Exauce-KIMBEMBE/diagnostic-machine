import {
  getMachineConfiguration,
  saveMachineConfiguration,
} from "../services/configurationService.js";

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

export async function getConfiguration(
  req,
  res,
  next
) {
  try {
    const machineId =
      parseMachineId(
        req.params.machineId ??
        req.query.machineId ??
        1
      );

    if (!machineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de machine invalide",
      });
    }

    const configuration =
      await getMachineConfiguration(machineId);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message:
          "Configuration introuvable",
      });
    }

    return res.json({
      success: true,
      configuration,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateConfiguration(
  req,
  res,
  next
) {
  try {
    const machineId =
      parseMachineId(
        req.params.machineId ??
        req.body.machineId ??
        1
      );

    if (!machineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de machine invalide",
      });
    }

    const reservoirHeightCm =
      Number(req.body.reservoirHeightCm);

    const reservoirCapacityLiters =
      Number(req.body.reservoirCapacityLiters);

    if (
      !Number.isFinite(reservoirHeightCm) ||
      reservoirHeightCm <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "reservoirHeightCm doit être supérieur à 0",
      });
    }

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

    const configuration =
      await saveMachineConfiguration(
        machineId,
        req.body
      );

    return res.json({
      success: true,
      message:
        "Configuration mise à jour",
      configuration,
    });
  } catch (error) {
    next(error);
  }
}
