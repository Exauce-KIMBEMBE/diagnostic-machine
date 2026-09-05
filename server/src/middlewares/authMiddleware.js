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

export function authenticate(
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

    const [
      scheme,
      token,
    ] =
      authorizationHeader.split(
        " "
      );

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

    const decoded =
      jwt.verify(
        token,
        getJwtSecret()
      );

    if (
      !decoded ||
      !decoded.id ||
      !decoded.role
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Token invalide",
        });
    }

    req.user = {
      id:
        Number(
          decoded.id
        ),

      name:
        decoded.name ??
        null,

      email:
        decoded.email ??
        null,

      role:
        decoded.role,
    };

    return next();
  } catch (
    error
  ) {
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

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Token invalide",
        });
    }

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

    const machineId =
      Number(
        req.params?.machineId ??
        req.query?.machineId ??
        req.body?.machineId ??
        req.body?.machine_id
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
    // MANAGER
    //==================================================

    /*
     * Le manager a accès à toutes
     * les machines.
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
