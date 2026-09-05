import {
  Router,
} from "express";

import {
  getConfiguration,
  updateConfiguration,
} from "../controllers/configurationController.js";

import {
  authenticate,
  requireMachineAccess,
  requireManager,
} from "../middlewares/authMiddleware.js";

const router = Router();

//======================================================
// RÉCUPÉRER LA CONFIGURATION
//======================================================

/*
 * GET /api/configuration?machineId=1
 *
 * CLIENT :
 * Peut consulter uniquement la configuration
 * de sa propre machine.
 *
 * MANAGER :
 * Peut consulter la configuration
 * de n'importe quelle machine.
 */

router.get(
  "/",
  authenticate,
  requireMachineAccess,
  getConfiguration
);

//======================================================
// RÉCUPÉRER LA CONFIGURATION PAR ID MACHINE
//======================================================

/*
 * GET /api/configuration/1
 *
 * CLIENT :
 * Peut consulter uniquement sa machine.
 *
 * MANAGER :
 * Peut consulter n'importe quelle machine.
 *
 * requireMachineAccess récupère automatiquement
 * req.params.machineId.
 */

router.get(
  "/:machineId",
  authenticate,
  requireMachineAccess,
  getConfiguration
);

//======================================================
// MODIFIER LA CONFIGURATION
//======================================================

/*
 * PUT /api/configuration/1
 *
 * MANAGER UNIQUEMENT.
 *
 * Le client peut consulter la configuration,
 * mais ne peut pas la modifier.
 */

router.put(
  "/:machineId",
  authenticate,
  requireManager,
  updateConfiguration
);

//======================================================

export default router;
