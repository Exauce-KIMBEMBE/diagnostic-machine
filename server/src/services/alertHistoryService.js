import {
  pool,
} from "../config/database.js";

//======================================================
// OUTILS
//======================================================

function normalizeMachineId(
  machineId
) {
  const value =
    Number(
      machineId
    );

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

//======================================================
// ENREGISTRER DES ALERTES
//======================================================

export async function saveAlerts(
  alerts = [],
  machineId
) {
  //====================================================
  // VALIDATION ALERTES
  //====================================================

  if (
    !Array.isArray(alerts) ||
    alerts.length === 0
  ) {
    return [];
  }

  //====================================================
  // VALIDATION MACHINE
  //====================================================

  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  if (
    !normalizedMachineId
  ) {
    throw new Error(
      "Identifiant machine invalide lors de l'enregistrement des alertes"
    );
  }

  //====================================================
  // ENREGISTREMENT
  //====================================================

  const savedAlerts = [];

  for (
    const alert of alerts
  ) {
    if (
      !alert ||
      typeof alert !==
        "object"
    ) {
      continue;
    }

    const source =
      alert.source !==
      undefined
        ? String(
            alert.source
          )
        : null;

    const level =
      alert.level !==
      undefined
        ? String(
            alert.level
          )
        : null;

    const message =
      alert.message !==
      undefined
        ? String(
            alert.message
          )
        : null;

    const measuredValue =
      alert.value !==
      undefined &&
      alert.value !==
      null
        ? String(
            alert.value
          )
        : null;

    const thresholdValue =
      alert.limit !==
      undefined &&
      alert.limit !==
      null
        ? String(
            alert.limit
          )
        : null;

    const sql = `
      INSERT INTO machine_alerts (
        machine_id,
        source,
        level,
        message,
        measured_value,
        threshold_value
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `;

    const values = [
      normalizedMachineId,
      source,
      level,
      message,
      measuredValue,
      thresholdValue,
    ];

    const [
      result,
    ] =
      await pool.query(
        sql,
        values
      );

    savedAlerts.push({
      ...alert,

      databaseId:
        Number(
          result.insertId
        ),

      machineId:
        normalizedMachineId,
    });
  }

  return savedAlerts;
}

//======================================================
// RÉCUPÉRER L'HISTORIQUE DES ALERTES
//======================================================

export async function getAlerts(
  limit = 100,
  machineId
) {
  //====================================================
  // MACHINE
  //====================================================

  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  if (
    !normalizedMachineId
  ) {
    throw new Error(
      "Identifiant machine invalide pour la récupération des alertes"
    );
  }

  //====================================================
  // LIMITE
  //====================================================

  const numericLimit =
    Number(
      limit
    );

  const safeLimit =
    Number.isInteger(
      numericLimit
    ) &&
    numericLimit > 0
      ? Math.min(
          numericLimit,
          500
        )
      : 100;

  //====================================================
  // REQUÊTE
  //====================================================

  const sql = `
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

    WHERE machine_id = ?

    ORDER BY
      created_at DESC,
      id DESC

    LIMIT ?
  `;

  const [
    rows,
  ] =
    await pool.query(
      sql,
      [
        normalizedMachineId,
        safeLimit,
      ]
    );

  return rows;
}

//======================================================
// RÉCUPÉRER LES ALERTES ACTIVES
//======================================================

export async function getActiveAlerts(
  machineId
) {
  //====================================================
  // MACHINE
  //====================================================

  const normalizedMachineId =
    normalizeMachineId(
      machineId
    );

  if (
    !normalizedMachineId
  ) {
    throw new Error(
      "Identifiant machine invalide pour la récupération des alertes actives"
    );
  }

  //====================================================
  // REQUÊTE
  //====================================================

  const sql = `
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

    WHERE machine_id = ?
      AND acknowledged = FALSE

    ORDER BY
      created_at DESC,
      id DESC
  `;

  const [
    rows,
  ] =
    await pool.query(
      sql,
      [
        normalizedMachineId,
      ]
    );

  return rows;
}

//======================================================
// ACQUITTER UNE ALERTE
//======================================================

export async function acknowledgeAlert(
  alertId
) {
  const normalizedAlertId =
    Number(
      alertId
    );

  if (
    !Number.isInteger(
      normalizedAlertId
    ) ||
    normalizedAlertId <= 0
  ) {
    return false;
  }

  const [
    result,
  ] =
    await pool.query(
      `
      UPDATE machine_alerts

      SET
        acknowledged = TRUE,
        acknowledged_at = NOW()

      WHERE id = ?
        AND acknowledged = FALSE
      `,
      [
        normalizedAlertId,
      ]
    );

  return (
    result.affectedRows >
    0
  );
}
