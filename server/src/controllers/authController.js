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
// INSCRIPTION
//======================================================

export async function register(
  req,
  res
) {
  const connection =
    await pool.getConnection();

  try {
    const name =
      String(
        req.body?.name ??
        ""
      ).trim();

    const email =
      normalizeEmail(
        req.body?.email
      );

    const password =
      String(
        req.body?.password ??
        ""
      );

    const machineId =
      Number(
        req.body?.machineId
      );

    //==================================================
    // VALIDATION
    //==================================================

    if (!name) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Nom requis",
        });
    }

    if (!email) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Email requis",
        });
    }

    if (!password) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Mot de passe requis",
        });
    }

    if (
      password.length < 8
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Le mot de passe doit contenir au moins 8 caractères",
        });
    }

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
    // TRANSACTION
    //==================================================

    await connection.beginTransaction();

    //==================================================
    // VÉRIFICATION EMAIL
    //==================================================

    const [
      existingUsers,
    ] =
      await connection.query(
        `
        SELECT
          id
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [
          email,
        ]
      );

    if (
      existingUsers.length >
      0
    ) {
      await connection.rollback();

      return res
        .status(409)
        .json({
          success: false,

          message:
            "Un compte existe déjà avec cet email",
        });
    }

    //==================================================
    // VÉRIFICATION MACHINE
    //==================================================

    const [
      machineRows,
    ] =
      await connection.query(
        `
        SELECT
          id,
          name,
          serial_number,
          location
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
      await connection.rollback();

      return res
        .status(404)
        .json({
          success: false,

          message:
            "Machine introuvable",
        });
    }

    //==================================================
    // VÉRIFICATION MACHINE DÉJÀ ATTRIBUÉE
    //==================================================

    /*
     * Chaque client doit être rattaché
     * uniquement à sa machine.
     *
     * Cette vérification empêche aussi
     * qu'une même machine soit attribuée
     * à plusieurs clients.
     */

    const [
      assignedMachineRows,
    ] =
      await connection.query(
        `
        SELECT
          um.user_id,
          u.email
        FROM user_machines AS um

        INNER JOIN users AS u
          ON u.id = um.user_id

        WHERE um.machine_id = ?
          AND u.role = 'client'

        LIMIT 1
        `,
        [
          machineId,
        ]
      );

    if (
      assignedMachineRows.length >
      0
    ) {
      await connection.rollback();

      return res
        .status(409)
        .json({
          success: false,

          message:
            "Cette machine est déjà associée à un client",
        });
    }

    //==================================================
    // HASH DU MOT DE PASSE
    //==================================================

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    //==================================================
    // CRÉATION DU COMPTE
    //==================================================

    /*
     * IMPORTANT :
     *
     * Le rôle est imposé ici.
     *
     * Même si le navigateur envoie :
     *
     * role = manager
     *
     * le serveur créera toujours :
     *
     * role = client
     */

    const [
      result,
    ] =
      await connection.query(
        `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role,
          active
        )
        VALUES (
          ?,
          ?,
          ?,
          'client',
          TRUE
        )
        `,
        [
          name,
          email,
          passwordHash,
        ]
      );

    const userId =
      Number(
        result.insertId
      );

    //==================================================
    // ASSOCIATION UTILISATEUR / MACHINE
    //==================================================

    await connection.query(
      `
      INSERT INTO user_machines (
        user_id,
        machine_id
      )
      VALUES (
        ?,
        ?
      )
      `,
      [
        userId,
        machineId,
      ]
    );

    //==================================================
    // VALIDATION TRANSACTION
    //==================================================

    await connection.commit();

    //==================================================
    // UTILISATEUR
    //==================================================

    const user = {
      id:
        userId,

      name,

      email,

      role:
        "client",
    };

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

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Compte créé avec succès",

        token,

        user,

        machines: [
          machineRows[0],
        ],
      });
  } catch (
    error
  ) {
    try {
      await connection.rollback();
    } catch (
      rollbackError
    ) {
      console.error(
        "Erreur rollback :",
        rollbackError
      );
    }

    console.error(
      "Erreur pendant l'inscription :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Erreur pendant la création du compte",
      });
  } finally {
    connection.release();
  }
}

//======================================================
// CONNEXION
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
    // VÉRIFICATION RÔLE
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
            "Compte utilisateur invalide",
        });
    }

    //==================================================
    // MOT DE PASSE
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
      "Erreur récupération utilisateur :",
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
