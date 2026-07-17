import "dotenv/config";

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import machineRoutes from "./routes/machineRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import thresholdRoutes from "./routes/thresholdRoutes.js";

import { testDatabaseConnection } from "./config/database.js";
import { initializeDatabase } from "./config/initDatabase.js";

const app = express();
const server = http.createServer(app);

const clientOrigin =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// Rendre Socket.IO accessible dans les contrôleurs
app.set("io", io);

// Middlewares
app.use(
  cors({
    origin: clientOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json());

// Route principale
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Serveur Diagnostic Machine actif",
  });
});

// Routes de l’API
app.use("/api", machineRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/thresholds", thresholdRoutes);

// Connexion des clients Socket.IO
io.on("connection", (socket) => {
  console.log("Client connecté :", socket.id);

  socket.on("disconnect", () => {
    console.log("Client déconnecté :", socket.id);
  });
});

const PORT = Number(process.env.PORT || 3001);

async function startServer() {
  try {
    const databaseConnected =
      await testDatabaseConnection();

    if (!databaseConnected) {
      throw new Error(
        "Impossible de se connecter à la base MySQL"
      );
    }

    await initializeDatabase();

    server.listen(PORT, "0.0.0.0", () => {
      console.log("");
      console.log("====================================");
      console.log(" Diagnostic Machine Server");
      console.log("====================================");
      console.log(`HTTP     : http://localhost:${PORT}`);
      console.log(`Client   : ${clientOrigin}`);
      console.log("SocketIO : OK");
      console.log("MySQL    : OK");
      console.log("Tables   : OK");
      console.log("====================================");
    });
  } catch (error) {
    console.error("");
    console.error(
      "Échec du démarrage du serveur :",
      error.message
    );

    process.exit(1);
  }
}

startServer();