import {
  pool,
} from "../config/database.js";

//======================================================
// VALIDATION MACHINE
//======================================================

function normalizeMachineId(machineId) {
  const id =
    Number(machineId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Identifiant de machine invalide"
    );
  }

  return id;
}

//======================================================
// VALIDATION IDENTIFIANT SEUIL
//======================================================

function normalizeThresholdId(id) {
  const thresholdId =
    Number(id);

  if (
    !Number.isInteger(thresholdId) ||
    thresholdId <= 0
  ) {
    throw new Error(
      "Identifiant de seuil invalide"
    );
  }

  return thresholdId;
}

//======================================================
// RÉCUPÉRER LES SEUILS D'UNE MACHINE
//======================================================

export async function getThresholds(
  machineId
) {
  const safeMachineId =
    normalizeMachineId(
      machineId
    );

  const [
    rows,
  ] =
    await pool.query(
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

      ORDER BY
        source ASC,
        parameter_name ASC
      `,
      [
        safeMachineId,
      ]
    );

  return rows;
}

//======================================================
// CRÉER OU MODIFIER UN SEUIL
//======================================================

export async function saveThreshold({
  machineId,
  source,
  parameterName,
  minimumValue = null,
  maximumValue = null,
  warningValue = null,
  criticalValue = null,
  unit = null,
}) {
  //====================================================
  // MACHINE
  //====================================================

  const safeMachineId =
    normalizeMachineId(
      machineId
    );

  //====================================================
  // SOURCE
  //====================================================

  const safeSource =
    String(
      source ?? ""
    ).trim();

  if (!safeSource) {
    throw new Error(
      "Source du seuil invalide"
    );
  }

  //====================================================
  // PARAMÈTRE
  //====================================================

  const safeParameterName =
    String(
      parameterName ?? ""
    ).trim();

  if (!safeParameterName) {
    throw new Error(
      "Nom du paramètre invalide"
    );
  }

  //====================================================
  // ENREGISTREMENT
  //====================================================

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

    ON DUPLICATE KEY UPDATE
      minimum_value =
        VALUES(minimum_value),

      maximum_value =
        VALUES(maximum_value),

      warning_value =
        VALUES(warning_value),

      critical_value =
        VALUES(critical_value),

      unit =
        VALUES(unit),

      updated_at =
        CURRENT_TIMESTAMP
  `;

  const values = [
    safeMachineId,
    safeSource,
    safeParameterName,
    minimumValue,
    maximumValue,
    warningValue,
    criticalValue,
    unit,
  ];

  await pool.query(
    sql,
    values
  );

  //====================================================
  // RÉCUPÉRER LE SEUIL ENREGISTRÉ
  //====================================================

  const [
    rows,
  ] =
    await pool.query(
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

      LIMIT 1
      `,
      [
        safeMachineId,
        safeSource,
        safeParameterName,
      ]
    );

  if (
    rows.length === 0
  ) {
    throw new Error(
      "Impossible de récupérer le seuil après enregistrement"
    );
  }

  return rows[0];
}

//======================================================
// SUPPRIMER UN SEUIL
//======================================================

export async function deleteThreshold(
  id,
  machineId
) {
  const safeThresholdId =
    normalizeThresholdId(
      id
    );

  const safeMachineId =
    normalizeMachineId(
      machineId
    );

  const [
    result,
  ] =
    await pool.query(
      `
      DELETE FROM machine_thresholds

      WHERE id = ?
        AND machine_id = ?
      `,
      [
        safeThresholdId,
        safeMachineId,
      ]
    );

  return (
    result.affectedRows >
    0
  );
}
