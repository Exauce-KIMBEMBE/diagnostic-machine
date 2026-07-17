import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
});

export async function testDatabaseConnection() {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATABASE() AS databaseName,
        NOW() AS serverTime
    `);

    console.log("Connexion MySQL réussie");
    console.log("Base utilisée :", rows[0].databaseName);
    console.log("Heure serveur :", rows[0].serverTime);

    return true;
  } catch (error) {
    console.error("Erreur de connexion MySQL :", error.message);
    return false;
  }
}