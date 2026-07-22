import "dotenv/config";

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import machineRoutes from "./routes/machineRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import thresholdRoutes from "./routes/thresholdRoutes.js";
import configurationRoutes from "./routes/configurationRoutes.js";
import firmwareRoutes from "./routes/firmwareRoutes.js";

import { testDatabaseConnection } from "./config/database.js";
import { initializeDatabase } from "./config/initDatabase.js";

const app = express();
const server = http.createServer(app);

/*
 * ===============================
 * CONFIGURATION CORS
 * ===============================
 */

const allowedOrigins = [
  "http://localhost:5173",
  "https://diagnostic-machine-fs2m.onrender.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    /*
     * Autorise :
     * - le dashboard React ;
     * - l'ESP32 ;
     * - Postman ;
     * - les requêtes serveur à serveur.
     */
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(
        `Origine non autorisée par CORS : ${origin}`
      )
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: true,
};

/*
 * ===============================
 * SOCKET.IO
 * ===============================
 */

const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

/*
 * ===============================
 * MIDDLEWARES
 * ===============================
 */

app.use(cors(corsOptions));

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/*
 * ===============================
 * ROUTE PRINCIPALE
 * ===============================
 */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Serveur Diagnostic Machine actif",
    timestamp: new Date().toISOString(),
  });
});

/*
 * ===============================
 * ROUTE DE TEST
 * ===============================
 */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

/*
 * ===============================
 * ROUTES API
 * ===============================
 */

/*
 * Machine :
 *
 * GET  /api/state
 * POST /api/measurements
 * GET  /api/history
 */
app.use("/api", machineRoutes);

/*
 * Alertes :
 *
 * GET   /api/alerts
 * GET   /api/alerts/active
 * PATCH /api/alerts/:id/acknowledge
 */
app.use("/api/alerts", alertRoutes);

/*
 * Seuils :
 *
 * GET    /api/thresholds
 * POST   /api/thresholds
 * DELETE /api/thresholds/:id
 */
app.use("/api/thresholds", thresholdRoutes);

/*
 * Configuration machine :
 *
 * GET /api/configuration
 * GET /api/configuration/:machineId
 * PUT /api/configuration/:machineId
 */
app.use(
  "/api/configuration",
  configurationRoutes
);


/*
 * Firmware OTA :
 *
 * GET /api/firmware
 * GET /api/firmware/download
 */
app.use(
  "/api/firmware",
  firmwareRoutes
);

/*
 * ===============================
 * ROUTE INTROUVABLE
 * ===============================
 */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route API introuvable",
    method: req.method,
    path: req.originalUrl,
  });
});

/*
 * ===============================
 * GESTION DES ERREURS
 * ===============================
 */

app.use((error, req, res, next) => {
  console.error("Erreur serveur :", error);

  if (
    error.message?.startsWith(
      "Origine non autorisée par CORS"
    )
  ) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  res.status(500).json({
    success: false,
    message: "Erreur interne du serveur",
    details: error.message,
  });
});

/*
 * ===============================
 * SOCKET.IO
 * ===============================
 */

io.on("connection", (socket) => {
  console.log(
    "Client Socket.IO connecté :",
    socket.id
  );

  socket.emit("server:connected", {
    success: true,
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "Client Socket.IO déconnecté :",
      socket.id,
      reason
    );
  });
});

const PORT = Number(
  process.env.PORT || 3001
);

/*
 * ===============================
 * DÉMARRAGE DU SERVEUR
 * ===============================
 */

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

    server.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log("");
        console.log(
          "===================================="
        );
        console.log(
          " Diagnostic Machine Server"
        );
        console.log(
          "===================================="
        );
        console.log(
          `HTTP     : http://localhost:${PORT}`
        );
        console.log(
          `Clients  : ${allowedOrigins.join(", ")}`
        );
        console.log(
          "SocketIO : OK"
        );
        console.log(
          "MySQL    : OK"
        );
        console.log(
          "Tables   : OK"
        );
        console.log(
          "Config   : OK"
        );
        console.log(
          "===================================="
        );
      }
    );
  } catch (error) {
    console.error("");
    console.error(
      "Échec du démarrage du serveur :",
      error
    );

    process.exit(1);
  }
}

startServer();
