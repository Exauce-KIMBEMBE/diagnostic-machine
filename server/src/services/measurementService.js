import { pool } from "../config/database.js";

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

export async function saveMeasurement(
  machineState,
  machineId = 1
) {
  const {
    lines,
    temperature,
    flow,
    tank = {},
  } = machineState;

  const sql = `
    INSERT INTO machine_measurements (

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
      tank_volume_liters

    )
    VALUES (

      ?,

      ?, ?, ?, ?, ?, ?,

      ?, ?, ?, ?, ?, ?,

      ?, ?, ?, ?, ?, ?,

      ?,

      ?,

      ?, ?, ?, ?

    )
  `;

  const values = [

    machineId,

    safeNumber(lines.L1.voltage),
    safeNumber(lines.L1.current),
    safeNumber(lines.L1.power),
    safeNumber(lines.L1.energy),
    safeNumber(lines.L1.frequency),
    safeNumber(lines.L1.powerFactor),

    safeNumber(lines.L2.voltage),
    safeNumber(lines.L2.current),
    safeNumber(lines.L2.power),
    safeNumber(lines.L2.energy),
    safeNumber(lines.L2.frequency),
    safeNumber(lines.L2.powerFactor),

    safeNumber(lines.L3.voltage),
    safeNumber(lines.L3.current),
    safeNumber(lines.L3.power),
    safeNumber(lines.L3.energy),
    safeNumber(lines.L3.frequency),
    safeNumber(lines.L3.powerFactor),

    safeNumber(temperature.value),

    safeNumber(flow.value),

    safeNumber(tank.distanceCm),
    safeNumber(tank.levelCm),
    safeNumber(tank.levelPercent),
    safeNumber(tank.volumeLiters),
  ];

  const [result] = await pool.query(
    sql,
    values
  );

  return result.insertId;
}
