import express from "express";

import {
  getAllAlerts,
  getCurrentAlerts,
  acknowledge,
} from "../controllers/alertController.js";

const router = express.Router();

// Toutes les alertes enregistrées
router.get("/", getAllAlerts);

// Alertes non acquittées
router.get("/active", getCurrentAlerts);

// Acquitter une alerte
router.patch("/:id/acknowledge", acknowledge);

export default router;