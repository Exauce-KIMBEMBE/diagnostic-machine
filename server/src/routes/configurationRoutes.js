import { Router } from "express";

import {
  getConfiguration,
  updateConfiguration,
} from "../controllers/configurationController.js";

const router = Router();

/*
 * GET /api/configuration
 *
 * Configuration de la machine 1.
 */
router.get(
  "/",
  getConfiguration
);

/*
 * GET /api/configuration/:machineId
 *
 * Configuration d'une machine précise.
 */
router.get(
  "/:machineId",
  getConfiguration
);

/*
 * PUT /api/configuration/:machineId
 *
 * Modification de la configuration.
 */
router.put(
  "/:machineId",
  updateConfiguration
);

export default router;
