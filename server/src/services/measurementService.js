import { pool } from "../config/database.js";

export async function saveMeasurement(
  machineState,
  machineId = 1
) {
  const { lines, temperature, flow } = machineState;

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
      flow_rate
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `;

  const values = [
    machineId,

    lines.L1.voltage,
    lines.L1.current,
    lines.L1.power,
    lines.L1.energy,
    lines.L1.frequency,
    lines.L1.powerFactor,

    lines.L2.voltage,
    lines.L2.current,
    lines.L2.power,
    lines.L2.energy,
    lines.L2.frequency,
    lines.L2.powerFactor,

    lines.L3.voltage,
    lines.L3.current,
    lines.L3.power,
    lines.L3.energy,
    lines.L3.frequency,
    lines.L3.powerFactor,

    temperature.value,
    flow.value,
  ];

  const [result] = await pool.query(sql, values);

  return result.insertId;
}