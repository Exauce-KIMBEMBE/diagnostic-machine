import { pool } from "../config/database.js";

export async function getThresholds() {
  const [rows] = await pool.query(`
    SELECT
      id,
      source,
      parameter_name,
      minimum_value,
      maximum_value,
      warning_value,
      critical_value,
      unit,
      updated_at
    FROM machine_thresholds
    ORDER BY source, parameter_name
  `);

  return rows;
}

export async function saveThreshold({
  source,
  parameterName,
  minimumValue = null,
  maximumValue = null,
  warningValue = null,
  criticalValue = null,
  unit = null,
}) {
  const sql = `
    INSERT INTO machine_thresholds (
      source,
      parameter_name,
      minimum_value,
      maximum_value,
      warning_value,
      critical_value,
      unit
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)

    ON DUPLICATE KEY UPDATE
      minimum_value = VALUES(minimum_value),
      maximum_value = VALUES(maximum_value),
      warning_value = VALUES(warning_value),
      critical_value = VALUES(critical_value),
      unit = VALUES(unit)
  `;

  const values = [
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
      source,
      parameter_name,
      minimum_value,
      maximum_value,
      warning_value,
      critical_value,
      unit,
      updated_at
    FROM machine_thresholds
    WHERE source = ?
      AND parameter_name = ?
    `,
    [source, parameterName]
  );

  return rows[0];
}

export async function deleteThreshold(id) {
  const [result] = await pool.query(
    `
    DELETE FROM machine_thresholds
    WHERE id = ?
    `,
    [id]
  );

  return result.affectedRows > 0;
}