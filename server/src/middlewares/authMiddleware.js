import jwt from "jsonwebtoken";

import {
  pool,
} from "../config/database.js";

//======================================================
// RÉCUPÉRATION DU SECRET JWT
//======================================================

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET manquant dans le fichier .env"
    );
  }

  return secret;
}

//======================================================
// AUTHENTIFICATION
//======================================================

export async function authenticate(
  req,
  res,
  next
) {
  try {
    const authorizationHeader =
      req.headers.authorization;

    if (!authorizationHeader) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentification requise",
        });
    }

    //==================================================
    // EXTRACTION DU TOKEN
    //==================================================

    const [
      scheme,
      token,
    ] =
      authorizationHeader
        .trim()
        .split(/\s+/);

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Token d'authentification invalide",
        });
    }

    //==================================================
    // VÉRIFICATION JWT
    //==================================================

    const decoded =
      jwt.verify(
        token,
        getJwtSecret()
      );

    const userId =
      Number(
        decoded?.id
      );

    if (
      !Number.isInteger(
        userId
      ) ||
      userId <= 0
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Token invalide",
        });
    }

    //==================================================
    // RÉCUPÉRATION DE L'UTILISATEUR ACTUEL
    //==================================================

    /*
     * IMPORTANT :
     *
     * On ne fait pas confiance au rôle stocké
     * dans le JWT.
     *
     * Cela permet :
     *
     * - de transformer client -> manager
     *   directement dans MySQL
     *
     * - de transformer manager -> client
     *
     * - de désactiver immédiatement un compte
     *
     * sans attendre l'expiration du JWT.
     */

    const [
      rows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          name,
          email,
          role,
          active
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [
          userId,
        ]
      );

    if (
      rows.length === 0
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Utilisateur introuvable",
        });
    }

    const user =
      rows[0];

    //==================================================
    // COMPTE ACTIF
    //==================================================

    if (
      user.active !== 1 &&
      user.active !== true
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Compte désactivé",
        });
    }

    //==================================================
    // RÔLE
    //==================================================

    if (
      ![
        "manager",
        "client",
      ].includes(
        user.role
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Rôle utilisateur invalide",
        });
    }

    //==================================================
    // UTILISATEUR AUTHENTIFIÉ
    //==================================================

    req.user = {
      id:
        Number(
          user.id
        ),

      name:
        user.name ??
        null,

      email:
        user.email ??
        null,

      role:
        user.role,
    };

    return next();
  } catch (
    error
  ) {
    //==================================================
    // TOKEN EXPIRÉ
    //==================================================

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Session expirée",
        });
    }

    //==================================================
    // TOKEN JWT INVALIDE
    //==================================================

    if (
      error.name ===
      "JsonWebTokenError" ||
      error.name ===
      "NotBeforeError"
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Token invalide",
        });
    }

    //==================================================
    // ERREUR SERVEUR
    //==================================================

    console.error(
      "Erreur d'authentification :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Erreur pendant l'authentification",
      });
  }
}

//======================================================
// ACCÈS MANAGER UNIQUEMENT
//======================================================

export function requireManager(
  req,
  res,
  next
) {
  if (
    !req.user
  ) {
    return res
      .status(401)
      .json({
        success: false,
        message:
          "Authentification requise",
      });
  }

  if (
    req.user.role !==
    "manager"
  ) {
    return res
      .status(403)
      .json({
        success: false,
        message:
          "Accès réservé aux managers",
      });
  }

  return next();
}

//======================================================
// ACCÈS CLIENT OU MANAGER
//======================================================

export function requireAuthenticatedUser(
  req,
  res,
  next
) {
  if (
    !req.user
  ) {
    return res
      .status(401)
      .json({
        success: false,
        message:
          "Authentification requise",
      });
  }

  if (
    ![
      "manager",
      "client",
    ].includes(
      req.user.role
    )
  ) {
    return res
      .status(403)
      .json({
        success: false,
        message:
          "Rôle utilisateur invalide",
      });
  }

  return next();
}

//======================================================
// ACCÈS À UNE MACHINE
//======================================================

export async function requireMachineAccess(
  req,
  res,
  next
) {
  try {
    if (
      !req.user
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentification requise",
        });
    }

    //==================================================
    // RÉCUPÉRATION DE L'IDENTIFIANT MACHINE
    //==================================================

    const rawMachineId =
      req.params?.machineId ??
      req.query?.machineId ??
      req.body?.machineId ??
      req.body?.machine_id;

    const machineId =
      Number(
        rawMachineId
      );

    if (
      !Number.isInteger(
        machineId
      ) ||
      machineId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Identifiant machine invalide",
        });
    }

    //==================================================
    // VÉRIFIER QUE LA MACHINE EXISTE
    //==================================================

    const [
      machineRows,
    ] =
      await pool.query(
        `
        SELECT
          id
        FROM machines
        WHERE id = ?
        LIMIT 1
        `,
        [
          machineId,
        ]
      );

    if (
      machineRows.length === 0
    ) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Machine introuvable",
        });
    }

    //==================================================
    // MANAGER
    //==================================================

    /*
     * Le manager a accès
     * à toutes les machines.
     */

    if (
      req.user.role ===
      "manager"
    ) {
      req.machineId =
        machineId;

      return next();
    }

    //==================================================
    // CLIENT
    //==================================================

    if (
      req.user.role !==
      "client"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Accès refusé",
        });
    }

    //==================================================
    // VÉRIFICATION UTILISATEUR / MACHINE
    //==================================================

    /*
     * Un client peut avoir plusieurs machines.
     *
     * Exemple dans user_machines :
     *
     * user_id | machine_id
     * --------|-----------
     *    5    |     1
     *    5    |     2
     *    5    |     6
     *
     * Cette requête vérifie uniquement
     * que la machine demandée fait partie
     * des machines attribuées à cet utilisateur.
     */

    const [
      rows,
    ] =
      await pool.query(
        `
        SELECT
          machine_id
        FROM user_machines
        WHERE user_id = ?
          AND machine_id = ?
        LIMIT 1
        `,
        [
          req.user.id,
          machineId,
        ]
      );

    if (
      rows.length === 0
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Vous n'avez pas accès à cette machine",
        });
    }

    //==================================================
    // MACHINE AUTORISÉE
    //==================================================

    req.machineId =
      machineId;

    return next();
  } catch (
    error
  ) {
    console.error(
      "Erreur vérification accès machine :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Erreur pendant la vérification de l'accès à la machine",
      });
  }
}
