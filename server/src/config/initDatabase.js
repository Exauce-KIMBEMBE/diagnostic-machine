import crypto from "crypto";

import {
  pool,
} from "./database.js";

//======================================================
// VÉRIFICATION DE L'EXISTENCE D'UNE COLONNE
//======================================================

async function columnExists(
  connection,
  tableName,
  columnName
) {
  const [rows] =
    await connection.query(
      `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      `,
      [
        tableName,
        columnName,
      ]
    );

  return Number(
    rows[0].total
  ) > 0;
}

//======================================================
// AJOUT D'UNE COLONNE SI ELLE N'EXISTE PAS
//======================================================

async function addColumnIfMissing(
  connection,
  tableName,
  columnName,
  definition
) {
  const exists =
    await columnExists(
      connection,
      tableName,
      columnName
    );

  if (!exists) {
    await connection.query(`
      ALTER TABLE ${tableName}
      ADD COLUMN ${columnName} ${definition}
    `);

    console.log(
      `Colonne ajoutée : ${tableName}.${columnName}`
    );
  }
}

//======================================================
// VÉRIFICATION DE L'EXISTENCE D'UN INDEX
//======================================================

async function indexExists(
  connection,
  tableName,
  indexName
) {
  const [rows] =
    await connection.query(
      `
      SELECT COUNT(*) AS total
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      `,
      [
        tableName,
        indexName,
      ]
    );

  return Number(
    rows[0].total
  ) > 0;
}

//======================================================
// AJOUT D'UN INDEX UNIQUE SI ABSENT
//======================================================

async function addUniqueIndexIfMissing(
  connection,
  tableName,
  indexName,
  columns
) {
  const exists =
    await indexExists(
      connection,
      tableName,
      indexName
    );

  if (exists) {
    return;
  }

  const columnList =
    columns.join(", ");

  await connection.query(`
    ALTER TABLE ${tableName}
    ADD UNIQUE INDEX ${indexName} (${columnList})
  `);

  console.log(
    `Index unique ajouté : ${tableName}.${indexName}`
  );
}

//======================================================
// SUPPRESSION D'UN INDEX S'IL EXISTE
//======================================================

async function removeIndexIfExists(
  connection,
  tableName,
  indexName
) {
  const exists =
    await indexExists(
      connection,
      tableName,
      indexName
    );

  if (!exists) {
    return;
  }

  await connection.query(`
    ALTER TABLE ${tableName}
    DROP INDEX ${indexName}
  `);

  console.log(
    `Index supprimé : ${tableName}.${indexName}`
  );
}

//======================================================
// SUPPRESSION DU DEFAULT SUR machine_id
//======================================================

async function removeMachineIdDefault(
  connection,
  tableName
) {
  const exists =
    await columnExists(
      connection,
      tableName,
      "machine_id"
    );

  if (!exists) {
    return;
  }

  await connection.query(`
    ALTER TABLE ${tableName}
    MODIFY COLUMN machine_id
    BIGINT UNSIGNED NOT NULL
  `);
}

//======================================================
// GÉNÉRATION D'UN CODE D'ACTIVATION
//======================================================

function generateActivationCode() {
  /*
   * Exemple :
   *
   * A7F4C9D2B681
   *
   * Ce code est utilisé par le client
   * pour associer physiquement une machine
   * à son compte.
   */

  return crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase();
}

//======================================================
// CRÉATION D'UN CODE D'ACTIVATION UNIQUE
//======================================================

async function generateUniqueActivationCode(
  connection
) {
  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const activationCode =
      generateActivationCode();

    const [rows] =
      await connection.query(
        `
        SELECT id
        FROM machines
        WHERE activation_code = ?
        LIMIT 1
        `,
        [
          activationCode,
        ]
      );

    if (
      rows.length === 0
    ) {
      return activationCode;
    }
  }

  throw new Error(
    "Impossible de générer un code d'activation unique"
  );
}

//======================================================
// CODES D'ACTIVATION DES MACHINES EXISTANTES
//======================================================

async function initializeMachineActivationCodes(
  connection
) {
  const [machines] =
    await connection.query(
      `
      SELECT
        id,
        activation_code

      FROM machines

      WHERE activation_code IS NULL
         OR activation_code = ''
      `
    );

  for (
    const machine
    of machines
  ) {
    const activationCode =
      await generateUniqueActivationCode(
        connection
      );

    await connection.query(
      `
      UPDATE machines
      SET activation_code = ?
      WHERE id = ?
      `,
      [
        activationCode,
        machine.id,
      ]
    );

    console.log(
      `Code d'activation généré pour la machine ${machine.id}`
    );
  }
}

//======================================================
// GÉNÉRATION D'UN TOKEN MACHINE
//======================================================

function generateMachineToken() {
  /*
   * Token utilisé par l'ESP32 pour
   * s'authentifier auprès du backend.
   *
   * 32 octets =
   * 64 caractères hexadécimaux.
   */

  return crypto
    .randomBytes(32)
    .toString("hex");
}

//======================================================
// CRÉATION D'UN TOKEN MACHINE UNIQUE
//======================================================

async function generateUniqueMachineToken(
  connection
) {
  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const machineToken =
      generateMachineToken();

    const [rows] =
      await connection.query(
        `
        SELECT id
        FROM machines
        WHERE machine_token = ?
        LIMIT 1
        `,
        [
          machineToken,
        ]
      );

    if (
      rows.length === 0
    ) {
      return machineToken;
    }
  }

  throw new Error(
    "Impossible de générer un token machine unique"
  );
}

//======================================================
// TOKENS DES MACHINES EXISTANTES
//======================================================

async function initializeMachineTokens(
  connection
) {
  const [machines] =
    await connection.query(
      `
      SELECT
        id,
        machine_token

      FROM machines

      WHERE machine_token IS NULL
         OR machine_token = ''
      `
    );

  for (
    const machine
    of machines
  ) {
    const machineToken =
      await generateUniqueMachineToken(
        connection
      );

    await connection.query(
      `
      UPDATE machines
      SET machine_token = ?
      WHERE id = ?
      `,
      [
        machineToken,
        machine.id,
      ]
    );

    console.log(
      `Token généré pour la machine ${machine.id}`
    );
  }
}

//======================================================
// INITIALISATION DE LA BASE
//======================================================

export async function initializeDatabase() {
  const connection =
    await pool.getConnection();

  try {
    //==================================================
    // TABLE DES MACHINES
    //==================================================

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

        name VARCHAR(100)
        NOT NULL,

        serial_number VARCHAR(100)
        UNIQUE,

        activation_code VARCHAR(64),

        machine_token VARCHAR(64),

        location VARCHAR(150),

        description TEXT,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        UNIQUE KEY unique_machine_activation_code (
          activation_code
        ),

        UNIQUE KEY unique_machine_token (
          machine_token
        )
      )
    `);

    //==================================================
    // MIGRATION activation_code
    //==================================================

    await addColumnIfMissing(
      connection,
      "machines",
      "activation_code",
      "VARCHAR(64) NULL AFTER serial_number"
    );

    await addUniqueIndexIfMissing(
      connection,
      "machines",
      "unique_machine_activation_code",
      [
        "activation_code",
      ]
    );

    //==================================================
    // MIGRATION machine_token
    //==================================================

    /*
     * Cette colonne est ajoutée maintenant,
     * mais le token ne sera PAS encore
     * obligatoire pour recevoir les mesures.
     *
     * L'ancien firmware ESP32 peut donc
     * continuer à fonctionner.
     */

    await addColumnIfMissing(
      connection,
      "machines",
      "machine_token",
      "VARCHAR(64) NULL AFTER activation_code"
    );

    await addUniqueIndexIfMissing(
      connection,
      "machines",
      "unique_machine_token",
      [
        "machine_token",
      ]
    );

    //==================================================
    // MACHINE PAR DÉFAUT
    //==================================================

    await connection.query(`
      INSERT IGNORE INTO machines (
        id,
        name,
        serial_number,
        location
      )
      VALUES (
        1,
        'Machine principale',
        'MACHINE-001',
        'Usine'
      )
    `);

    //==================================================
    // INITIALISATION DES CODES D'ACTIVATION
    //==================================================

    await initializeMachineActivationCodes(
      connection
    );

    //==================================================
    // INITIALISATION DES TOKENS MACHINES
    //==================================================

    await initializeMachineTokens(
      connection
    );

    //==================================================
    // UTILISATEURS
    //==================================================

    /*
     * Toute inscription crée un compte client.
     *
     * Un manager sera créé en modifiant
     * manuellement le rôle du compte
     * dans la base de données.
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

        name VARCHAR(100)
        NOT NULL,

        email VARCHAR(190)
        NOT NULL,

        password_hash VARCHAR(255)
        NOT NULL,

        role ENUM(
          'manager',
          'client'
        )
        NOT NULL
        DEFAULT 'client',

        active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY unique_user_email (
          email
        ),

        INDEX idx_users_role (
          role
        ),

        INDEX idx_users_active (
          active
        )
      )
    `);

    //==================================================
    // ASSOCIATION UTILISATEURS / MACHINES
    //==================================================

    /*
     * Un utilisateur peut avoir plusieurs machines.
     *
     * Une machine ne peut appartenir
     * qu'à un seul client.
     *
     * Les managers ont accès à toutes
     * les machines sans association.
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_machines (
        user_id BIGINT UNSIGNED
        NOT NULL,

        machine_id BIGINT UNSIGNED
        NOT NULL,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (
          user_id,
          machine_id
        ),

        UNIQUE KEY unique_user_machine_machine (
          machine_id
        ),

        INDEX idx_user_machines_user (
          user_id
        ),

        CONSTRAINT fk_user_machines_user
        FOREIGN KEY (
          user_id
        )
        REFERENCES users(id)
        ON DELETE CASCADE,

        CONSTRAINT fk_user_machines_machine
        FOREIGN KEY (
          machine_id
        )
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    //==================================================
    // MIGRATION user_machines
    //==================================================

    await removeIndexIfExists(
      connection,
      "user_machines",
      "unique_user_machine_user"
    );

    await addUniqueIndexIfMissing(
      connection,
      "user_machines",
      "unique_user_machine_machine",
      [
        "machine_id",
      ]
    );

    //==================================================
    // MESURES
    //==================================================

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_measurements (
        id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED
        NOT NULL,

        l1_voltage DECIMAL(10,2)
        DEFAULT 0,

        l1_current DECIMAL(10,3)
        DEFAULT 0,

        l1_power DECIMAL(12,2)
        DEFAULT 0,

        l1_energy DECIMAL(14,3)
        DEFAULT 0,

        l1_frequency DECIMAL(6,2)
        DEFAULT 0,

        l1_power_factor DECIMAL(5,3)
        DEFAULT 0,

        l2_voltage DECIMAL(10,2)
        DEFAULT 0,

        l2_current DECIMAL(10,3)
        DEFAULT 0,

        l2_power DECIMAL(12,2)
        DEFAULT 0,

        l2_energy DECIMAL(14,3)
        DEFAULT 0,

        l2_frequency DECIMAL(6,2)
        DEFAULT 0,

        l2_power_factor DECIMAL(5,3)
        DEFAULT 0,

        l3_voltage DECIMAL(10,2)
        DEFAULT 0,

        l3_current DECIMAL(10,3)
        DEFAULT 0,

        l3_power DECIMAL(12,2)
        DEFAULT 0,

        l3_energy DECIMAL(14,3)
        DEFAULT 0,

        l3_frequency DECIMAL(6,2)
        DEFAULT 0,

        l3_power_factor DECIMAL(5,3)
        DEFAULT 0,

        temperature DECIMAL(8,2)
        DEFAULT 0,

        flow_rate DECIMAL(10,2)
        DEFAULT 0,

        tank_distance_cm DECIMAL(10,2)
        DEFAULT 0,

        tank_level_cm DECIMAL(10,2)
        DEFAULT 0,

        tank_level_percent DECIMAL(6,2)
        DEFAULT 0,

        tank_volume_liters DECIMAL(14,2)
        DEFAULT 0,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_measurements_machine (
          machine_id
        ),

        INDEX idx_measurements_created (
          created_at
        ),

        CONSTRAINT fk_measurements_machine
        FOREIGN KEY (
          machine_id
        )
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    await removeMachineIdDefault(
      connection,
      "machine_measurements"
    );

    //==================================================
    // COLONNES RÉSERVOIR
    //==================================================

    await addColumnIfMissing(
      connection,
      "machine_measurements",
      "tank_distance_cm",
      "DECIMAL(10,2) DEFAULT 0 AFTER flow_rate"
    );

    await addColumnIfMissing(
      connection,
      "machine_measurements",
      "tank_level_cm",
      "DECIMAL(10,2) DEFAULT 0 AFTER tank_distance_cm"
    );

    await addColumnIfMissing(
      connection,
      "machine_measurements",
      "tank_level_percent",
      "DECIMAL(6,2) DEFAULT 0 AFTER tank_level_cm"
    );

    await addColumnIfMissing(
      connection,
      "machine_measurements",
      "tank_volume_liters",
      "DECIMAL(14,2) DEFAULT 0 AFTER tank_level_percent"
    );

    //==================================================
    // ALERTES
    //==================================================

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_alerts (
        id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED
        NOT NULL,

        source VARCHAR(50)
        NOT NULL,

        level ENUM(
          'warning',
          'critical'
        )
        NOT NULL,

        message VARCHAR(255)
        NOT NULL,

        measured_value VARCHAR(100),

        threshold_value VARCHAR(100),

        acknowledged BOOLEAN
        DEFAULT FALSE,

        acknowledged_at DATETIME
        NULL,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_alerts_machine (
          machine_id
        ),

        INDEX idx_alerts_created (
          created_at
        ),

        CONSTRAINT fk_alerts_machine
        FOREIGN KEY (
          machine_id
        )
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    await removeMachineIdDefault(
      connection,
      "machine_alerts"
    );

    //==================================================
    // SEUILS
    //==================================================

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_thresholds (
        id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED
        NOT NULL,

        source VARCHAR(50)
        NOT NULL,

        parameter_name VARCHAR(100)
        NOT NULL,

        minimum_value DECIMAL(14,4),

        maximum_value DECIMAL(14,4),

        warning_value DECIMAL(14,4),

        critical_value DECIMAL(14,4),

        unit VARCHAR(30),

        updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY unique_machine_parameter (
          machine_id,
          source,
          parameter_name
        ),

        CONSTRAINT fk_thresholds_machine
        FOREIGN KEY (
          machine_id
        )
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    await removeMachineIdDefault(
      connection,
      "machine_thresholds"
    );

    //==================================================
    // SEUILS PAR DÉFAUT MACHINE 1
    //==================================================

    const defaultThresholds = [
      [
        1,
        "L1",
        "voltage",
        210,
        240,
        null,
        null,
        "V",
      ],

      [
        1,
        "L1",
        "current",
        0,
        10,
        null,
        null,
        "A",
      ],

      [
        1,
        "L1",
        "power",
        0,
        2200,
        null,
        null,
        "W",
      ],

      [
        1,
        "L1",
        "frequency",
        49,
        51,
        null,
        null,
        "Hz",
      ],

      [
        1,
        "L1",
        "powerFactor",
        0.8,
        1,
        null,
        null,
        "",
      ],

      [
        1,
        "L2",
        "voltage",
        210,
        240,
        null,
        null,
        "V",
      ],

      [
        1,
        "L2",
        "current",
        0,
        10,
        null,
        null,
        "A",
      ],

      [
        1,
        "L2",
        "power",
        0,
        2200,
        null,
        null,
        "W",
      ],

      [
        1,
        "L2",
        "frequency",
        49,
        51,
        null,
        null,
        "Hz",
      ],

      [
        1,
        "L2",
        "powerFactor",
        0.8,
        1,
        null,
        null,
        "",
      ],

      [
        1,
        "L3",
        "voltage",
        210,
        240,
        null,
        null,
        "V",
      ],

      [
        1,
        "L3",
        "current",
        0,
        10,
        null,
        null,
        "A",
      ],

      [
        1,
        "L3",
        "power",
        0,
        2200,
        null,
        null,
        "W",
      ],

      [
        1,
        "L3",
        "frequency",
        49,
        51,
        null,
        null,
        "Hz",
      ],

      [
        1,
        "L3",
        "powerFactor",
        0.8,
        1,
        null,
        null,
        "",
      ],

      [
        1,
        "temperature",
        "temperature",
        -20,
        125,
        60,
        80,
        "°C",
      ],

      [
        1,
        "flow",
        "flowRate",
        5,
        60,
        null,
        null,
        "L/min",
      ],

      [
        1,
        "tank",
        "levelPercent",
        0,
        100,
        20,
        10,
        "%",
      ],

      [
        1,
        "tank",
        "distanceCm",
        20,
        600,
        null,
        null,
        "cm",
      ],

      [
        1,
        "tank",
        "volumeLiters",
        0,
        1000,
        null,
        null,
        "L",
      ],
    ];

    for (
      const threshold
      of defaultThresholds
    ) {
      await connection.query(
        `
        INSERT IGNORE INTO machine_thresholds (
          machine_id,
          source,
          parameter_name,
          minimum_value,
          maximum_value,
          warning_value,
          critical_value,
          unit
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
        `,
        threshold
      );
    }

    //==================================================
    // CONFIGURATION DES MACHINES
    //==================================================

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_configurations (
        id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED
        NOT NULL,

        ultrasonic_offset_cm DECIMAL(10,2)
        NOT NULL DEFAULT 0,

        reservoir_height_cm DECIMAL(10,2)
        NOT NULL DEFAULT 100,

        reservoir_capacity_liters DECIMAL(14,2)
        NOT NULL DEFAULT 1000,

        temperature_offset_c DECIMAL(8,2)
        NOT NULL DEFAULT 0,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY unique_machine_configuration (
          machine_id
        ),

        CONSTRAINT fk_configuration_machine
        FOREIGN KEY (
          machine_id
        )
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    //==================================================
    // CONFIGURATION INITIALE MACHINE 1
    //==================================================

    await connection.query(`
      INSERT IGNORE INTO machine_configurations (
        machine_id,
        ultrasonic_offset_cm,
        reservoir_height_cm,
        reservoir_capacity_liters,
        temperature_offset_c
      )
      VALUES (
        1,
        0,
        100,
        1000,
        0
      )
    `);

    //==================================================
    // FIN
    //==================================================

    console.log(
      "===================================="
    );

    console.log(
      "Base de données initialisée"
    );

    console.log(
      "Table machines             OK"
    );

    console.log(
      "Codes activation           OK"
    );

    console.log(
      "Tokens machines            OK"
    );

    console.log(
      "Table users                OK"
    );

    console.log(
      "Table user_machines        OK"
    );

    console.log(
      "Multi-machines/client      OK"
    );

    console.log(
      "Table measurements         OK"
    );

    console.log(
      "Colonnes réservoir         OK"
    );

    console.log(
      "Table alerts               OK"
    );

    console.log(
      "Table thresholds           OK"
    );

    console.log(
      "Seuils par défaut          OK"
    );

    console.log(
      "Table configurations       OK"
    );

    console.log(
      "===================================="
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur pendant l'initialisation de la base :",
      error
    );

    throw error;
  } finally {
    connection.release();
  }
}
