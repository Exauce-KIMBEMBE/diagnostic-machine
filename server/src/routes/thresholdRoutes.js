import express from "express";

import {
  getAllThresholds,
  createOrUpdateThreshold,
  removeThreshold,
} from "../controllers/thresholdController.js";

import {
  authenticate,
  requireMachineAccess,
  requireManager,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

//======================================================
// RÉCUPÉRER LES SEUILS
//======================================================

/*
 * GET /api/thresholds?machineId=1
 *
 * CLIENT :
 * Peut consulter uniquement les seuils
 * de sa propre machine.
 *
 * MANAGER :
 * Peut consulter les seuils
 * de n'importe quelle machine.
 */
router.get(
  "/",
  authenticate,
  requireMachineAccess,
  getAllThresholds
);

//======================================================
// CRÉER OU MODIFIER UN SEUIL
//======================================================

/*
 * POST /api/thresholds
 *
 * MANAGER uniquement.
 *
 * Exemple :
 *
 * {
 *   "machineId": 1,
 *   "source": "L1",
 *   "parameterName": "voltage",
 *   "minimumValue": 210,
 *   "maximumValue": 240,
 *   "unit": "V"
 * }
 *
 * Le client peut voir les seuils,
 * mais ne peut pas les modifier.
 */
router.post(
  "/",
  authenticate,
  requireManager,
  createOrUpdateThreshold
);

//======================================================
// SUPPRIMER UN SEUIL
//======================================================

/*
 * DELETE /api/thresholds/:id?machineId=1
 *
 * MANAGER uniquement.
 */
router.delete(
  "/:id",
  authenticate,
  requireManager,
  removeThreshold
);

//======================================================

export default router;
