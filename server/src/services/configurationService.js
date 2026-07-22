import { pool } from "../config/database.js";

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

export async function getMachineConfiguration(
  machineId = 1
) {
  const [rows] = await pool.query(
    `
    SELECT
      machine_id AS machineId,
      ultrasonic_offset_cm AS ultrasonicOffsetCm,
      reservoir_height_cm AS reservoirHeightCm,
      reservoir_capacity_liters AS reservoirCapacityLiters,
      temperature_offset_c AS temperatureOffsetC,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM machine_configurations
    WHERE machine_id = ?
    LIMIT 1
    `,
    [machineId]
  );

  return rows[0] ?? null;
}

export async function saveMachineConfiguration(
  machineId,
  configuration
) {
  const ultrasonicOffsetCm = safeNumber(
    configuration.ultrasonicOffsetCm,
    0
  );

  const reservoirHeightCm = safeNumber(
    configuration.reservoirHeightCm,
    100
  );

  const reservoirCapacityLiters = safeNumber(
    configuration.reservoirCapacityLiters,
    1000
  );

  const temperatureOffsetC = safeNumber(
    configuration.temperatureOffsetC,
    0
  );

  await pool.query(
    `
    INSERT INTO machine_configurations (
      machine_id,
      ultrasonic_offset_cm,
      reservoir_height_cm,
      reservoir_capacity_liters,
      temperature_offset_c
    )
    VALUES (?, ?, ?, ?, ?)

    ON DUPLICATE KEY UPDATE
      ultrasonic_offset_cm =
        VALUES(ultrasonic_offset_cm),

      reservoir_height_cm =
        VALUES(reservoir_height_cm),

      reservoir_capacity_liters =
        VALUES(reservoir_capacity_liters),

      temperature_offset_c =
        VALUES(temperature_offset_c)
    `,
    [
      machineId,
      ultrasonicOffsetCm,
      reservoirHeightCm,
      reservoirCapacityLiters,
      temperatureOffsetC,
    ]
  );

  return getMachineConfiguration(machineId);
}
