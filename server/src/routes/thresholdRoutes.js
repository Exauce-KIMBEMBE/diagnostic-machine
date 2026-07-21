import express from "express";

import {
  getAllThresholds,
  createOrUpdateThreshold,
  removeThreshold,
} from "../controllers/thresholdController.js";

const router = express.Router();

/*
 * ===============================
 * SEUILS
 * ===============================
 */

/*
 * GET /api/thresholds
 * GET /api/thresholds?machineId=1
 */
router.get("/", getAllThresholds);

/*
 * POST /api/thresholds
 *
 * Exemple :
 * {
 *   "machineId":1,
 *   "source":"L1",
 *   "parameterName":"voltage",
 *   "minimumValue":210,
 *   "maximumValue":240,
 *   "unit":"V"
 * }
 */
router.post("/", createOrUpdateThreshold);

/*
 * DELETE /api/thresholds/:id
 * DELETE /api/thresholds/:id?machineId=1
 */
router.delete("/:id", removeThreshold);

export default router;
