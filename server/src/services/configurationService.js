import {
  pool,
} from "../config/database.js";

//======================================================
// OUTILS
//======================================================

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

//======================================================
// VALIDATION MACHINE
//======================================================

function normalizeMachineId(
  machineId
) {
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
// RÉCUPÉRER LA CONFIGURATION
//======================================================

export async function getMachineConfiguration(
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
        machine_id
          AS machineId,

        ultrasonic_offset_cm
          AS ultrasonicOffsetCm,

        reservoir_height_cm
          AS reservoirHeightCm,

        reservoir_capacity_liters
          AS reservoirCapacityLiters,

        temperature_offset_c
          AS temperatureOffsetC,

        created_at
          AS createdAt,

        updated_at
          AS updatedAt

      FROM machine_configurations

      WHERE machine_id = ?

      LIMIT 1
      `,
      [
        safeMachineId,
      ]
    );

  return (
    rows[0] ??
    null
  );
}

//======================================================
// ENREGISTRER LA CONFIGURATION
//======================================================

export async function saveMachineConfiguration(
  machineId,
  configuration = {}
) {
  //====================================================
  // MACHINE
  //====================================================

  const safeMachineId =
    normalizeMachineId(
      machineId
    );

  //====================================================
  // CONFIGURATION
  //====================================================

  const ultrasonicOffsetCm =
    safeNumber(
      configuration.ultrasonicOffsetCm,
      0
    );

  const reservoirHeightCm =
    safeNumber(
      configuration.reservoirHeightCm,
      100
    );

  const reservoirCapacityLiters =
    safeNumber(
      configuration.reservoirCapacityLiters,
      1000
    );

  const temperatureOffsetC =
    safeNumber(
      configuration.temperatureOffsetC,
      0
    );

  //====================================================
  // VALIDATION
  //====================================================

  if (
    reservoirHeightCm <= 0
  ) {
    throw new Error(
      "reservoirHeightCm doit être supérieur à 0"
    );
  }

  if (
    reservoirCapacityLiters <= 0
  ) {
    throw new Error(
      "reservoirCapacityLiters doit être supérieur à 0"
    );
  }

  //====================================================
  // ENREGISTREMENT
  //====================================================

  await pool.query(
    `
    INSERT INTO machine_configurations (
      machine_id,
      ultrasonic_offset_cm,
      reservoir_height_cm,
      reservoir_capacity_liters,
      temperature_offset_c
    )

    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?
    )

    ON DUPLICATE KEY UPDATE

      ultrasonic_offset_cm =
        VALUES(
          ultrasonic_offset_cm
        ),

      reservoir_height_cm =
        VALUES(
          reservoir_height_cm
        ),

      reservoir_capacity_liters =
        VALUES(
          reservoir_capacity_liters
        ),

      temperature_offset_c =
        VALUES(
          temperature_offset_c
        ),

      updated_at =
        CURRENT_TIMESTAMP
    `,
    [
      safeMachineId,
      ultrasonicOffsetCm,
      reservoirHeightCm,
      reservoirCapacityLiters,
      temperatureOffsetC,
    ]
  );

  //====================================================
  // RETOURNER LA CONFIGURATION ENREGISTRÉE
  //====================================================

  return getMachineConfiguration(
    safeMachineId
  );
}
