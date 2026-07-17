import express from "express";

import {
  getAllThresholds,
  createOrUpdateThreshold,
  removeThreshold,
} from "../controllers/thresholdController.js";

const router = express.Router();

// Récupérer tous les seuils
router.get("/", getAllThresholds);

// Créer ou modifier un seuil
router.post("/", createOrUpdateThreshold);

// Supprimer un seuil
router.delete("/:id", removeThreshold);

export default router;