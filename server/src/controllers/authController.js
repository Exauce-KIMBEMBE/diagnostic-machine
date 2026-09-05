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

function normalizeSerialNumber(
  serialNumber
) {
  return String(
    serialNumber ?? ""
  )
    .trim();
}

//======================================================

function normalizeMachineId(
  value
) {
  const machineId =
    Number(value);

  if (
    !Number.isInteger(
      machineId
    ) ||
    machineId <= 0
  ) {
    return null;
  }

  return machineId;
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
// RÉCUPÉRATION DES MACHINES D'UN UTILISATEUR
//======================================================

async function getUserMachines(
  user
) {
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

    return machineRows;
  }

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

  return machineRows;
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

  let transactionStarted =
    false;

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
      normalizeMachineId(
        req.body?.machineId
      );

    const serialNumber =
      normalizeSerialNumber(
        req.body?.serialNumber ??
        req.body?.serial_number
      );

    //==================================================
    // VALIDATION
    //==================================================

    if (!name) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Nom requis",
        });
    }

    if (!email) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Email requis",
        });
    }

    if (!password) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Mot de passe requis",
        });
    }

    if (
      password.length <
      8
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Le mot de passe doit contenir au moins 8 caractères",
        });
    }

    if (!machineId) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Identifiant machine invalide",
        });
    }

    if (!serialNumber) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Numéro de série de la machine requis",
        });
    }

    //==================================================
    // TRANSACTION
    //==================================================

    await connection.beginTransaction();

    transactionStarted =
      true;

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

      transactionStarted =
        false;

      return res
        .status(409)
        .json({
          success:
            false,

          message:
            "Un compte existe déjà avec cet email",
        });
    }

    //==================================================
    // VÉRIFICATION MACHINE + NUMÉRO DE SÉRIE
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
          location,
          description,
          created_at

        FROM machines

        WHERE id = ?
          AND serial_number = ?

        LIMIT 1
        `,
        [
          machineId,
          serialNumber,
        ]
      );

    if (
      machineRows.length ===
      0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "Machine introuvable ou numéro de série incorrect",
        });
    }

    //==================================================
    // VERROUILLAGE DE LA MACHINE
    //==================================================

    /*
     * FOR UPDATE permet d'éviter que deux
     * comptes essaient d'associer la même
     * machine exactement au même moment.
     */

    const [
      lockedMachineRows,
    ] =
      await connection.query(
        `
        SELECT
          id

        FROM machines

        WHERE id = ?

        LIMIT 1

        FOR UPDATE
        `,
        [
          machineId,
        ]
      );

    if (
      lockedMachineRows.length ===
      0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "Machine introuvable",
        });
    }

    //==================================================
    // MACHINE DÉJÀ ATTRIBUÉE
    //==================================================

    const [
      assignedMachineRows,
    ] =
      await connection.query(
        `
        SELECT
          um.user_id

        FROM user_machines AS um

        WHERE um.machine_id = ?

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

      transactionStarted =
        false;

      return res
        .status(409)
        .json({
          success:
            false,

          message:
            "Cette machine est déjà associée à un compte",
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
     * Le rôle est volontairement
     * imposé à client.
     *
     * Le navigateur ne peut donc pas
     * créer directement un manager.
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
    // PREMIÈRE MACHINE DU CLIENT
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
    // VALIDATION
    //==================================================

    await connection.commit();

    transactionStarted =
      false;

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
        success:
          true,

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
    if (
      transactionStarted
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
    }

    console.error(
      "Erreur pendant l'inscription :",
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

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
          success:
            false,

          message:
            "Email et mot de passe requis",
        });
    }

    //==================================================
    // UTILISATEUR
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
      rows.length ===
      0
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

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
          success:
            false,

          message:
            "Ce compte est désactivé",
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
          success:
            false,

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
          success:
            false,

          message:
            "Email ou mot de passe incorrect",
        });
    }

    //==================================================
    // MACHINES AUTORISÉES
    //==================================================

    const machines =
      await getUserMachines(
        user
      );

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
      success:
        true,

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
        success:
          false,

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
          success:
            false,

          message:
            "Authentification requise",
        });
    }

    //==================================================
    // UTILISATEUR
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
      rows.length ===
      0
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

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
          success:
            false,

          message:
            "Ce compte est désactivé",
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
          success:
            false,

          message:
            "Compte utilisateur invalide",
        });
    }

    //==================================================
    // MACHINES
    //==================================================

    const machines =
      await getUserMachines(
        user
      );

    //==================================================
    // RÉPONSE
    //==================================================

    return res.json({
      success:
        true,

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
        success:
          false,

        message:
          "Erreur pendant la récupération de l'utilisateur",
      });
  }
}

//======================================================
// AJOUTER UNE MACHINE AU COMPTE ACTUEL
//======================================================

export async function addMachineToCurrentUser(
  req,
  res
) {
  const connection =
    await pool.getConnection();

  let transactionStarted =
    false;

  try {
    //==================================================
    // UTILISATEUR CONNECTÉ
    //==================================================

    const userId =
      Number(
        req.user?.id
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
          success:
            false,

          message:
            "Authentification requise",
        });
    }

    if (
      req.user.role !==
      "client"
    ) {
      return res
        .status(403)
        .json({
          success:
            false,

          message:
            "Cette opération est réservée aux comptes clients",
        });
    }

    //==================================================
    // MACHINE
    //==================================================

    const machineId =
      normalizeMachineId(
        req.body?.machineId
      );

    const serialNumber =
      normalizeSerialNumber(
        req.body?.serialNumber ??
        req.body?.serial_number
      );

    if (!machineId) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Identifiant machine invalide",
        });
    }

    if (!serialNumber) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Numéro de série requis",
        });
    }

    //==================================================
    // TRANSACTION
    //==================================================

    await connection.beginTransaction();

    transactionStarted =
      true;

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
          location,
          description,
          created_at

        FROM machines

        WHERE id = ?
          AND serial_number = ?

        LIMIT 1

        FOR UPDATE
        `,
        [
          machineId,
          serialNumber,
        ]
      );

    if (
      machineRows.length ===
      0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "Machine introuvable ou numéro de série incorrect",
        });
    }

    //==================================================
    // VÉRIFIER SI LE CLIENT POSSÈDE DÉJÀ LA MACHINE
    //==================================================

    const [
      currentAssignmentRows,
    ] =
      await connection.query(
        `
        SELECT
          user_id,
          machine_id

        FROM user_machines

        WHERE machine_id = ?

        LIMIT 1
        `,
        [
          machineId,
        ]
      );

    if (
      currentAssignmentRows.length >
      0
    ) {
      const existingUserId =
        Number(
          currentAssignmentRows[0]
            .user_id
        );

      await connection.rollback();

      transactionStarted =
        false;

      if (
        existingUserId ===
        userId
      ) {
        return res
          .status(409)
          .json({
            success:
              false,

            message:
              "Cette machine est déjà associée à votre compte",
          });
      }

      return res
        .status(409)
        .json({
          success:
            false,

          message:
            "Cette machine est déjà associée à un autre compte",
        });
    }

    //==================================================
    // ASSOCIATION
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
    // VALIDATION
    //==================================================

    await connection.commit();

    transactionStarted =
      false;

    //==================================================
    // LISTE ACTUALISÉE
    //==================================================

    const machines =
      await getUserMachines({
        id:
          userId,

        role:
          "client",
      });

    //==================================================
    // RÉPONSE
    //==================================================

    return res
      .status(201)
      .json({
        success:
          true,

        message:
          "Machine ajoutée à votre compte",

        machine:
          machineRows[0],

        machines,
      });
  } catch (
    error
  ) {
    if (
      transactionStarted
    ) {
      try {
        await connection.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Erreur rollback ajout machine :",
          rollbackError
        );
      }
    }

    /*
     * Sécurité supplémentaire si l'index
     * UNIQUE(machine_id) de user_machines
     * intercepte deux associations
     * simultanées.
     */
    if (
      error?.code ===
      "ER_DUP_ENTRY"
    ) {
      return res
        .status(409)
        .json({
          success:
            false,

          message:
            "Cette machine est déjà associée à un compte",
        });
    }

    console.error(
      "Erreur ajout machine au compte :",
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Impossible d'ajouter cette machine au compte",
      });
  } finally {
    connection.release();
  }
}
