import { pool } from "../config/database.js";

function normalizeMachineId(machineId) {
  const id = Number(machineId);

  if (!Number.isInteger(id) || id <= 0) {
    return 1;
  }

  return id;
}

export async function getThresholds(machineId = 1) {
  const safeMachineId = normalizeMachineId(machineId);

  const [rows] = await pool.query(
    `
    SELECT
      id,
      machine_id,
      source,
      parameter_name,
      minimum_value,
      maximum_value,
      warning_value,
      critical_value,
      unit,
      updated_at
    FROM machine_thresholds
    WHERE machine_id = ?
    ORDER BY source, parameter_name
    `,
    [safeMachineId]
  );

  return rows;
}

export async function saveThreshold({
  machineId = 1,
  source,
  parameterName,
  minimumValue = null,
  maximumValue = null,
  warningValue = null,
  criticalValue = null,
  unit = null,
}) {
  const safeMachineId = normalizeMachineId(machineId);

  const sql = `
    INSERT INTO machine_thresholds (

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

    ON DUPLICATE KEY UPDATE

      minimum_value = VALUES(minimum_value),

      maximum_value = VALUES(maximum_value),

      warning_value = VALUES(warning_value),

      critical_value = VALUES(critical_value),

      unit = VALUES(unit)
  `;

  const values = [
    safeMachineId,
    source,
    parameterName,
    minimumValue,
    maximumValue,
    warningValue,
    criticalValue,
    unit,
  ];

  await pool.query(sql, values);

  const [rows] = await pool.query(
    `
    SELECT
      id,
      machine_id,
      source,
      parameter_name,
      minimum_value,
      maximum_value,
      warning_value,
      critical_value,
      unit,
      updated_at
    FROM machine_thresholds
    WHERE machine_id = ?
      AND source = ?
      AND parameter_name = ?
    `,
    [
      safeMachineId,
      source,
      parameterName,
    ]
  );

  return rows[0];
}

export async function deleteThreshold(
  id,
  machineId = 1
) {
  const safeMachineId = normalizeMachineId(machineId);

  const [result] = await pool.query(
    `
    DELETE FROM machine_thresholds
    WHERE id = ?
      AND machine_id = ?
    `,
    [
      Number(id),
      safeMachineId,
    ]
  );

  return result.affectedRows > 0;
}
