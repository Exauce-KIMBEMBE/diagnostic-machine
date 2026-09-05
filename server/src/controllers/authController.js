import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  pool,
} from "../config/database.js";

//======================================================
// OUTILS
//======================================================

function normalizeEmail(
  email
) {
  return String(
    email ?? ""
  )
    .trim()
    .toLowerCase();
}

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

function getJwtExpiresIn() {
  return (
    process.env.JWT_EXPIRES_IN ||
    "12h"
  );
}

//======================================================

function createToken(
  user
) {
  return jwt.sign(
    {
      id:
        Number(
          user.id
        ),

      name:
        user.name,

      email:
        user.email,

      role:
        user.role,
    },

    getJwtSecret(),

    {
      expiresIn:
        getJwtExpiresIn(),
    }
  );
}

//======================================================
// LOGIN
//======================================================

export async function login(
  req,
  res
) {
  try {
    const email =
      normalizeEmail(
        req.body?.email
      );

    const password =
      String(
        req.body?.password ??
        ""
      );

    //==================================================
    // VALIDATION
    //==================================================

    if (
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Email et mot de passe requis",
        });
    }

    //==================================================
    // RECHERCHE UTILISATEUR
    //==================================================

    const [
      rows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          name,
          email,
          password_hash,
          role,
          active,
          created_at,
          updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [
          email,
        ]
      );

    if (
      rows.length === 0
    ) {
      /*
       * On ne précise pas si l'email existe
       * afin d'éviter de révéler les comptes
       * présents dans la base.
       */
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Email ou mot de passe incorrect",
        });
    }

    const user =
      rows[0];

    //==================================================
    // COMPTE ACTIF
    //==================================================

    if (
      Number(
        user.active
      ) !== 1
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Ce compte est désactivé",
        });
    }

    //==================================================
    // VÉRIFICATION DU RÔLE
    //==================================================

    if (
      ![
        "manager",
        "client",
      ].includes(
        user.role
      )
    ) {
      console.error(
        "Rôle utilisateur invalide :",
        user.role
      );

      return res
        .status(403)
        .json({
          success: false,

          message:
            "Compte utilisateur invalide",
        });
    }

    //==================================================
    // VÉRIFICATION MOT DE PASSE
    //==================================================

    const passwordValid =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (
      !passwordValid
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Email ou mot de passe incorrect",
        });
    }

    //==================================================
    // MACHINES AUTORISÉES
    //==================================================

    let machines = [];

    /*
     * Un manager a accès à toutes les machines.
     */
    if (
      user.role ===
      "manager"
    ) {
      const [
        machineRows,
      ] =
        await pool.query(
          `
          SELECT
            id,
            name,
            serial_number,
            location,
            description,
            created_at
          FROM machines
          ORDER BY id ASC
          `
        );

      machines =
        machineRows;
    } else {
      /*
       * Un client n'a accès qu'aux machines
       * qui lui sont attribuées dans user_machines.
       */
      const [
        machineRows,
      ] =
        await pool.query(
          `
          SELECT
            m.id,
            m.name,
            m.serial_number,
            m.location,
            m.description,
            m.created_at
          FROM user_machines AS um

          INNER JOIN machines AS m
            ON m.id = um.machine_id

          WHERE um.user_id = ?

          ORDER BY m.id ASC
          `,
          [
            user.id,
          ]
        );

      machines =
        machineRows;
    }

    //==================================================
    // TOKEN
    //==================================================

    const token =
      createToken(
        user
      );

    //==================================================
    // RÉPONSE
    //==================================================

    return res.json({
      success: true,

      message:
        "Connexion réussie",

      token,

      user: {
        id:
          Number(
            user.id
          ),

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,
      },

      machines,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur pendant la connexion :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Erreur pendant la connexion",
      });
  }
}

//======================================================
// UTILISATEUR ACTUEL
//======================================================

export async function getCurrentUser(
  req,
  res
) {
  try {
    if (
      !req.user?.id
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
    // RECHERCHE UTILISATEUR
    //==================================================

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
          active,
          created_at,
          updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [
          req.user.id,
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
    // COMPTE DÉSACTIVÉ
    //==================================================

    if (
      Number(
        user.active
      ) !== 1
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Ce compte est désactivé",
        });
    }

    //==================================================
    // MACHINES AUTORISÉES
    //==================================================

    let machines = [];

    if (
      user.role ===
      "manager"
    ) {
      const [
        machineRows,
      ] =
        await pool.query(
          `
          SELECT
            id,
            name,
            serial_number,
            location,
            description,
            created_at
          FROM machines
          ORDER BY id ASC
          `
        );

      machines =
        machineRows;
    } else {
      const [
        machineRows,
      ] =
        await pool.query(
          `
          SELECT
            m.id,
            m.name,
            m.serial_number,
            m.location,
            m.description,
            m.created_at
          FROM user_machines AS um

          INNER JOIN machines AS m
            ON m.id = um.machine_id

          WHERE um.user_id = ?

          ORDER BY m.id ASC
          `,
          [
            user.id,
          ]
        );

      machines =
        machineRows;
    }

    //==================================================
    // RÉPONSE
    //==================================================

    return res.json({
      success: true,

      user: {
        id:
          Number(
            user.id
          ),

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        createdAt:
          user.created_at,

        updatedAt:
          user.updated_at,
      },

      machines,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur pendant la récupération de l'utilisateur :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Erreur pendant la récupération de l'utilisateur",
      });
  }
}
