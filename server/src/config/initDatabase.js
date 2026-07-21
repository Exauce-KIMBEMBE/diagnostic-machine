import { pool } from "./database.js";

async function columnExists(
  connection,
  tableName,
  columnName
) {
  const [rows] = await connection.query(
    `
    SELECT COUNT(*) AS total
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  return Number(rows[0].total) > 0;
}

async function addColumnIfMissing(
  connection,
  tableName,
  columnName,
  definition
) {
  const exists = await columnExists(
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

export async function initializeDatabase() {
  const connection = await pool.getConnection();

  try {
    /*
     * ===============================
     * TABLE DES MACHINES
     * ===============================
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        name VARCHAR(100) NOT NULL,

        serial_number VARCHAR(100) UNIQUE,

        location VARCHAR(150),

        description TEXT,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    /*
     * ===============================
     * MESURES
     * ===============================
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_measurements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED
        NOT NULL DEFAULT 1,

        l1_voltage DECIMAL(10,2) DEFAULT 0,
        l1_current DECIMAL(10,3) DEFAULT 0,
        l1_power DECIMAL(12,2) DEFAULT 0,
        l1_energy DECIMAL(14,3) DEFAULT 0,
        l1_frequency DECIMAL(6,2) DEFAULT 0,
        l1_power_factor DECIMAL(5,3) DEFAULT 0,

        l2_voltage DECIMAL(10,2) DEFAULT 0,
        l2_current DECIMAL(10,3) DEFAULT 0,
        l2_power DECIMAL(12,2) DEFAULT 0,
        l2_energy DECIMAL(14,3) DEFAULT 0,
        l2_frequency DECIMAL(6,2) DEFAULT 0,
        l2_power_factor DECIMAL(5,3) DEFAULT 0,

        l3_voltage DECIMAL(10,2) DEFAULT 0,
        l3_current DECIMAL(10,3) DEFAULT 0,
        l3_power DECIMAL(12,2) DEFAULT 0,
        l3_energy DECIMAL(14,3) DEFAULT 0,
        l3_frequency DECIMAL(6,2) DEFAULT 0,
        l3_power_factor DECIMAL(5,3) DEFAULT 0,

        temperature DECIMAL(8,2) DEFAULT 0,

        flow_rate DECIMAL(10,2) DEFAULT 0,

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

        INDEX idx_measurements_machine(machine_id),

        INDEX idx_measurements_created(created_at),

        CONSTRAINT fk_measurements_machine
        FOREIGN KEY(machine_id)
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    /*
     * Ajout des colonnes si la table existait déjà.
     */

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

    /*
     * ===============================
     * ALERTES
     * ===============================
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_alerts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED
        NOT NULL DEFAULT 1,

        source VARCHAR(50) NOT NULL,

        level ENUM(
          'warning',
          'critical'
        ) NOT NULL,

        message VARCHAR(255) NOT NULL,

        measured_value VARCHAR(100),

        threshold_value VARCHAR(100),

        acknowledged BOOLEAN DEFAULT FALSE,

        acknowledged_at DATETIME NULL,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_alerts_machine(machine_id),

        INDEX idx_alerts_created(created_at),

        CONSTRAINT fk_alerts_machine
        FOREIGN KEY(machine_id)
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    /*
     * ===============================
     * SEUILS
     * ===============================
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_thresholds (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED
        NOT NULL DEFAULT 1,

        source VARCHAR(50) NOT NULL,

        parameter_name VARCHAR(100) NOT NULL,

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
        FOREIGN KEY(machine_id)
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    /*
     * ===============================
     * SEUILS PAR DÉFAUT
     * ===============================
     */

    const defaultThresholds = [
      [1, "L1", "voltage", 210, 240, null, null, "V"],
      [1, "L1", "current", 0, 10, null, null, "A"],
      [1, "L1", "power", 0, 2200, null, null, "W"],
      [1, "L1", "frequency", 49, 51, null, null, "Hz"],
      [1, "L1", "powerFactor", 0.8, 1, null, null, ""],

      [1, "L2", "voltage", 210, 240, null, null, "V"],
      [1, "L2", "current", 0, 10, null, null, "A"],
      [1, "L2", "power", 0, 2200, null, null, "W"],
      [1, "L2", "frequency", 49, 51, null, null, "Hz"],
      [1, "L2", "powerFactor", 0.8, 1, null, null, ""],

      [1, "L3", "voltage", 210, 240, null, null, "V"],
      [1, "L3", "current", 0, 10, null, null, "A"],
      [1, "L3", "power", 0, 2200, null, null, "W"],
      [1, "L3", "frequency", 49, 51, null, null, "Hz"],
      [1, "L3", "powerFactor", 0.8, 1, null, null, ""],

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

    for (const threshold of defaultThresholds) {
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        threshold
      );
    }

    /*
     * ===============================
     * CONFIGURATION DES MACHINES
     * ===============================
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_configurations (
        id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED NOT NULL,

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

        UNIQUE KEY unique_machine_configuration(
          machine_id
        ),

        CONSTRAINT fk_configuration_machine
        FOREIGN KEY(machine_id)
        REFERENCES machines(id)
        ON DELETE CASCADE
      )
    `);

    /*
     * Configuration initiale de la machine 1.
     */

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

    console.log("====================================");
    console.log("Base de données initialisée");
    console.log("Table machines             OK");
    console.log("Table measurements         OK");
    console.log("Colonnes réservoir         OK");
    console.log("Table alerts               OK");
    console.log("Table thresholds           OK");
    console.log("Seuils par défaut          OK");
    console.log("Table configurations       OK");
    console.log("====================================");
  } catch (error) {
    console.error(
      "Erreur pendant l'initialisation de la base :",
      error
    );

    throw error;
  } finally {
    connection.release();
  }
}
