import express from "express";

import {
  getMachineState,
  receiveMeasurements,
  getHistory,
  getHistoryByPeriod,
} from "../controllers/machineController.js";

const router = express.Router();

// État actuel de la machine
router.get("/state", getMachineState);

// Réception des mesures envoyées par l’ESP32
router.post("/measurements", receiveMeasurements);

// Dernières mesures enregistrées
router.get("/history", getHistory);

// Historique filtré par période
router.get("/history/period", getHistoryByPeriod);

export default router;