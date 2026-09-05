import express from "express";

import {
  getAllAlerts,
  getCurrentAlerts,
  acknowledge,
} from "../controllers/alertController.js";

import {
  authenticate,
  requireMachineAccess,
  requireManager,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

//======================================================
// TOUTES LES ALERTES
//======================================================

/*
 * GET /api/alerts?machineId=1
 *
 * MANAGER :
 * Peut consulter les alertes
 * de n'importe quelle machine.
 *
 * CLIENT :
 * Peut consulter uniquement
 * les alertes de sa machine.
 */
router.get(
  "/",
  authenticate,
  requireMachineAccess,
  getAllAlerts
);

//======================================================
// ALERTES ACTIVES
//======================================================

/*
 * GET /api/alerts/active?machineId=1
 *
 * MANAGER :
 * Peut consulter les alertes actives
 * de n'importe quelle machine.
 *
 * CLIENT :
 * Peut consulter uniquement
 * les alertes actives de sa machine.
 */
router.get(
  "/active",
  authenticate,
  requireMachineAccess,
  getCurrentAlerts
);

//======================================================
// ACQUITTER UNE ALERTE
//======================================================

/*
 * PATCH /api/alerts/:id/acknowledge
 *
 * Pour le moment :
 * MANAGER uniquement.
 *
 * Le client peut voir les alertes,
 * mais il ne peut pas les acquitter.
 */
router.patch(
  "/:id/acknowledge",
  authenticate,
  requireManager,
  acknowledge
);

//======================================================

export default router;
