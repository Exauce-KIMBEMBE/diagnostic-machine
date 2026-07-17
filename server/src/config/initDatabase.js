import { pool } from "./database.js";

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

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

      )
    `);

    await connection.query(`
      INSERT IGNORE INTO machines
      (id,name,serial_number,location)

      VALUES
      (1,'Machine principale','MACHINE-001','Usine')
    `);

    /*
     * ===============================
     * MESURES
     * ===============================
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_measurements (

        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED NOT NULL DEFAULT 1,

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

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_machine(machine_id),
        INDEX idx_created(created_at),

        CONSTRAINT fk_measurements_machine
        FOREIGN KEY(machine_id)
        REFERENCES machines(id)
        ON DELETE CASCADE

      )
    `);

    /*
     * ===============================
     * ALERTES
     * ===============================
     */

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_alerts (

        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        machine_id BIGINT UNSIGNED NOT NULL DEFAULT 1,

        source VARCHAR(50) NOT NULL,

        level ENUM('warning','critical') NOT NULL,

        message VARCHAR(255) NOT NULL,

        measured_value VARCHAR(100),

        threshold_value VARCHAR(100),

        acknowledged BOOLEAN DEFAULT FALSE,

        acknowledged_at DATETIME NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_machine(machine_id),
        INDEX idx_created(created_at),

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

        machine_id BIGINT UNSIGNED NOT NULL DEFAULT 1,

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

        UNIQUE KEY unique_machine_parameter
        (
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

    console.log("====================================");
    console.log("Base de données initialisée");
    console.log("Table machines         OK");
    console.log("Table measurements     OK");
    console.log("Table alerts           OK");
    console.log("Table thresholds       OK");
    console.log("====================================");

  } catch (error) {

    console.error(error);

    throw error;

  } finally {

    connection.release();

  }
}