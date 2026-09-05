import express from "express";

import {
  login,
  register,
  getCurrentUser,
} from "../controllers/authController.js";

import {
  authenticate,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

//======================================================
// INSCRIPTION
//======================================================

/*
 * POST /api/auth/register
 *
 * {
 *   "name": "Jean",
 *   "email": "jean@email.com",
 *   "password": "motDePasse",
 *   "machineId": 1
 * }
 *
 * Tous les nouveaux utilisateurs
 * sont automatiquement CLIENT.
 */
router.post(
  "/register",
  register
);

//======================================================
// CONNEXION
//======================================================

router.post(
  "/login",
  login
);

//======================================================
// UTILISATEUR CONNECTÉ
//======================================================

router.get(
  "/me",
  authenticate,
  getCurrentUser
);

//======================================================

export default router;
