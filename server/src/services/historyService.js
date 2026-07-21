import { pool } from "../config/database.js";

function normalizeLimit(limit) {
  return Math.min(
    Math.max(Number(limit) || 100, 1),
    5000
  );
}

function normalizeMachineId(machineId) {
  if (
    machineId === null ||
    machineId === undefined ||
    machineId === ""
  ) {
    return null;
  }

  const parsedMachineId = Number(machineId);

  if (
    !Number.isInteger(parsedMachineId) ||
    parsedMachineId <= 0
  ) {
    return null;
  }

  return parsedMachineId;
}

export async function getMeasurementHistory(
  limit = 100,
  machineId = null
) {
  const safeLimit = normalizeLimit(limit);
  const safeMachineId =
    normalizeMachineId(machineId);

  let sql = `
    SELECT
      id,
      machine_id,

      l1_voltage,
      l1_current,
      l1_power,
      l1_energy,
      l1_frequency,
      l1_power_factor,

      l2_voltage,
      l2_current,
      l2_power,
      l2_energy,
      l2_frequency,
      l2_power_factor,

      l3_voltage,
      l3_current,
      l3_power,
      l3_energy,
      l3_frequency,
      l3_power_factor,

      temperature,
      flow_rate,

      tank_distance_cm,
      tank_level_cm,
      tank_level_percent,
      tank_volume_liters,

      created_at
    FROM machine_measurements
  `;

  const values = [];

  if (safeMachineId !== null) {
    sql += `
      WHERE machine_id = ?
    `;

    values.push(safeMachineId);
  }

  sql += `
    ORDER BY created_at DESC
    LIMIT ?
  `;

  values.push(safeLimit);

  const [rows] = await pool.query(sql, values);

  return rows;
}

export async function getMeasurementHistoryByPeriod(
  period = "24h",
  machineId = null
) {
  const periodMap = {
    "1h": 1,
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  };

  const hours = periodMap[period] || 24;

  const safeMachineId =
    normalizeMachineId(machineId);

  let sql = `
    SELECT
      id,
      machine_id,

      l1_voltage,
      l1_current,
      l1_power,
      l1_energy,
      l1_frequency,
      l1_power_factor,

      l2_voltage,
      l2_current,
      l2_power,
      l2_energy,
      l2_frequency,
      l2_power_factor,

      l3_voltage,
      l3_current,
      l3_power,
      l3_energy,
      l3_frequency,
      l3_power_factor,

      temperature,
      flow_rate,

      tank_distance_cm,
      tank_level_cm,
      tank_level_percent,
      tank_volume_liters,

      created_at
    FROM machine_measurements
    WHERE created_at >= DATE_SUB(
      NOW(),
      INTERVAL ? HOUR
    )
  `;

  const values = [hours];

  if (safeMachineId !== null) {
    sql += `
      AND machine_id = ?
    `;

    values.push(safeMachineId);
  }

  sql += `
    ORDER BY created_at ASC
  `;

  const [rows] = await pool.query(sql, values);

  return rows;
}
