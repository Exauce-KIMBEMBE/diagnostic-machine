import express from "express";

import {
  login,
  register,
  getCurrentUser,
  addMachineToCurrentUser,
} from "../controllers/authController.js";

import {
  authenticate,
} from "../middlewares/authMiddleware.js";

const router =
  express.Router();

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
 *   "machineId": 1,
 *   "serialNumber": "MACHINE-001"
 * }
 *
 * Tous les nouveaux utilisateurs
 * sont automatiquement CLIENT.
 *
 * La première machine est associée
 * au compte pendant l'inscription.
 */
router.post(
  "/register",
  register
);

//======================================================
// CONNEXION
//======================================================

/*
 * POST /api/auth/login
 *
 * {
 *   "email": "jean@email.com",
 *   "password": "motDePasse"
 * }
 */
router.post(
  "/login",
  login
);

//======================================================
// UTILISATEUR CONNECTÉ
//======================================================

/*
 * GET /api/auth/me
 *
 * Authorization:
 * Bearer TOKEN
 *
 * Retourne :
 *
 * - l'utilisateur connecté
 * - son rôle
 * - toutes ses machines
 *
 * Un manager reçoit toutes les machines.
 * Un client reçoit uniquement
 * les machines qui lui sont attribuées.
 */
router.get(
  "/me",
  authenticate,
  getCurrentUser
);

//======================================================
// AJOUTER UNE MACHINE AU COMPTE
//======================================================

/*
 * POST /api/auth/machines
 *
 * Authorization:
 * Bearer TOKEN
 *
 * {
 *   "machineId": 2,
 *   "serialNumber": "MACHINE-002"
 * }
 *
 * Cette route permet à un CLIENT
 * déjà connecté d'ajouter une nouvelle
 * machine à son compte.
 *
 * Le contrôleur vérifie :
 *
 * - que l'utilisateur est authentifié
 * - que l'utilisateur est un client
 * - que la machine existe
 * - que l'identifiant correspond
 *   au numéro de série
 * - que la machine n'est pas déjà
 *   attribuée à un autre compte
 */
router.post(
  "/machines",
  authenticate,
  addMachineToCurrentUser
);

//======================================================

export default router;
