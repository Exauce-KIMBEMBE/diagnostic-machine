import express from "express";

import {
  login,
  getCurrentUser,
} from "../controllers/authController.js";

import {
  authenticate,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

//======================================================
// CONNEXION
//======================================================

/*
 * POST /api/auth/login
 *
 * Body attendu :
 *
 * {
 *   "email": "manager@example.com",
 *   "password": "motDePasse"
 * }
 */
router.post(
  "/login",
  login
);

//======================================================
// UTILISATEUR ACTUEL
//======================================================

/*
 * GET /api/auth/me
 *
 * Header :
 *
 * Authorization: Bearer TOKEN
 */
router.get(
  "/me",
  authenticate,
  getCurrentUser
);

//======================================================
// EXPORT
//======================================================

export default router;
