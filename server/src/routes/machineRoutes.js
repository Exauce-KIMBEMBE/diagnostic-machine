import express from "express";

import {
  getMachineState,
  receiveMeasurements,
  getHistory,
  getHistoryByPeriod,
} from "../controllers/machineController.js";

const router = express.Router();

/*
 * ===============================
 * ÉTAT ACTUEL DE LA MACHINE
 * ===============================
 */

/*
 * GET /api/state
 *
 * Retourne l’état actuel d’une machine.
 *
 * Exemple :
 * GET /api/state?machineId=1
 */
router.get(
  "/state",
  getMachineState
);

/*
 * ===============================
 * MESURES ENVOYÉES PAR L’ESP32
 * ===============================
 */

/*
 * POST /api/measurements
 *
 * Reçoit les nouvelles mesures
 * envoyées par l’ESP32.
 *
 * La présence de la machine est déjà
 * détectée dans index.js avant l’appel
 * au contrôleur.
 */
router.post(
  "/measurements",
  receiveMeasurements
);

/*
 * ===============================
 * HISTORIQUE COMPLET
 * ===============================
 */

/*
 * GET /api/history
 *
 * Exemple :
 * GET /api/history?machineId=1
 */
router.get(
  "/history",
  getHistory
);

/*
 * ===============================
 * HISTORIQUE PAR PÉRIODE
 * ===============================
 */

/*
 * GET /api/history/period
 *
 * Exemples :
 * GET /api/history/period?machineId=1&period=24h
 * GET /api/history/period?machineId=1&period=7d
 * GET /api/history/period?machineId=1&period=30d
 */
router.get(
  "/history/period",
  getHistoryByPeriod
);

export default router;
