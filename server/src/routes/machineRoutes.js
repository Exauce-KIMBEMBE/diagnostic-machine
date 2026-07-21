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
 * ETAT ACTUEL
 * ===============================
 */

router.get("/state", getMachineState);

/*
 * ===============================
 * MESURES ENVOYÉES PAR L'ESP32
 * ===============================
 */

router.post("/measurements", receiveMeasurements);

/*
 * ===============================
 * HISTORIQUE
 * ===============================
 */

router.get("/history", getHistory);

router.get(
  "/history/period",
  getHistoryByPeriod
);

export default router;
