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

// =====================================================
// CONFIGURATION CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "https://diagnostic-machine-fs2m.onrender.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Autorise les requêtes sans origine (ESP32, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`Origine non autorisée par CORS : ${origin}`)
    );
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
};

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
  cors: corsOptions,
});

// Rendre Socket.IO accessible dans les contrôleurs
app.set("io", io);

// =====================================================
// MIDDLEWARES
// =====================================================

app.use(cors(corsOptions));
app.use(express.json());

// =====================================================
// ROUTE PRINCIPALE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Serveur Diagnostic Machine actif",
  });
});

// =====================================================
// ROUTES API
// =====================================================

app.use("/api", machineRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/thresholds", thresholdRoutes);

// =====================================================
// SOCKET.IO
// =====================================================

io.on("connection", (socket) => {
  console.log("Client connecté :", socket.id);

  socket.on("disconnect", () => {
    console.log("Client déconnecté :", socket.id);
  });
});

const PORT = Number(process.env.PORT || 3001);

// =====================================================
// DEMARRAGE SERVEUR
// =====================================================

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
      console.log(`Clients  : ${allowedOrigins.join(", ")}`);
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
