import jwt from "jsonwebtoken";

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
      id: Number(
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
