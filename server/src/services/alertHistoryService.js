import { pool } from "../config/database.js";

export async function saveAlerts(
  alerts = [],
  machineId = 1
) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return [];
  }

  const savedAlerts = [];

  for (const alert of alerts) {
    const sql = `
      INSERT INTO machine_alerts (
        machine_id,
        source,
        level,
        message,
        measured_value,
        threshold_value
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      machineId,
      alert.source,
      alert.level,
      alert.message,
      alert.value !== undefined
        ? String(alert.value)
        : null,
      alert.limit !== undefined
        ? String(alert.limit)
        : null,
    ];

    const [result] = await pool.query(sql, values);

    savedAlerts.push({
      ...alert,
      databaseId: result.insertId,
      machineId,
    });
  }

  return savedAlerts;
}

export async function getAlerts(
  limit = 100,
  machineId = null
) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 100, 1),
    1000
  );

  let sql = `
    SELECT
      id,
      machine_id,
      source,
      level,
      message,
      measured_value,
      threshold_value,
      acknowledged,
      acknowledged_at,
      created_at
    FROM machine_alerts
  `;

  const values = [];

  if (machineId) {
    sql += `
      WHERE machine_id = ?
    `;

    values.push(Number(machineId));
  }

  sql += `
    ORDER BY created_at DESC
    LIMIT ?
  `;

  values.push(safeLimit);

  const [rows] = await pool.query(sql, values);

  return rows;
}

export async function getActiveAlerts(
  machineId = null
) {
  let sql = `
    SELECT
      id,
      machine_id,
      source,
      level,
      message,
      measured_value,
      threshold_value,
      acknowledged,
      acknowledged_at,
      created_at
    FROM machine_alerts
    WHERE acknowledged = FALSE
  `;

  const values = [];

  if (machineId) {
    sql += `
      AND machine_id = ?
    `;

    values.push(Number(machineId));
  }

  sql += `
    ORDER BY created_at DESC
  `;

  const [rows] = await pool.query(sql, values);

  return rows;
}

export async function acknowledgeAlert(alertId) {
  const [result] = await pool.query(
    `
    UPDATE machine_alerts
    SET
      acknowledged = TRUE,
      acknowledged_at = NOW()
    WHERE id = ?
    `,
    [Number(alertId)]
  );

  return result.affectedRows > 0;
}