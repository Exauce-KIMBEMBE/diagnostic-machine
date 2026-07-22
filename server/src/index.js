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

import {
  testDatabaseConnection,
} from "./config/database.js";

import {
  initializeDatabase,
} from "./config/initDatabase.js";

const app = express();
const server = http.createServer(app);

/*
 * Durée maximale sans données avant de considérer
 * une machine comme hors ligne.
 */
const MACHINE_OFFLINE_DELAY = 30000;

/*
 * Fréquence de vérification des machines.
 */
const MACHINE_CHECK_INTERVAL = 5000;

/*
 * Stockage temporaire en mémoire.
 *
 * Clé   : identifiant de la machine
 * Valeur :
 * {
 *   online: boolean,
 *   lastSeen: number,
 *   lastData: object | null
 * }
 */
const connectedMachines = new Map();

let databaseConnected = false;

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
     * Les appareils comme l’ESP32 et Postman
     * peuvent envoyer une requête sans Origin.
     */
    if (
      !origin ||
      allowedOrigins.includes(origin)
    ) {
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
 * GESTION DE PRÉSENCE DES MACHINES
 * ===============================
 */

function normalizeMachineId(machineId) {
  const normalizedId =
    Number(machineId);

  if (
    !Number.isInteger(normalizedId) ||
    normalizedId <= 0
  ) {
    return null;
  }

  return normalizedId;
}

function getMachineRoom(machineId) {
  return `machine:${machineId}`;
}

function getMachinePresence(machineId) {
  const normalizedId =
    normalizeMachineId(machineId);

  if (!normalizedId) {
    return {
      machineId: null,
      online: false,
      lastSeen: null,
      lastData: null,
    };
  }

  const machine =
    connectedMachines.get(
      normalizedId
    );

  if (!machine) {
    return {
      machineId: normalizedId,
      online: false,
      lastSeen: null,
      lastData: null,
    };
  }

  const elapsed =
    Date.now() -
    machine.lastSeen;

  const online =
    machine.online === true &&
    elapsed <
      MACHINE_OFFLINE_DELAY;

  return {
    machineId: normalizedId,
    online,
    lastSeen: machine.lastSeen,
    lastData:
      machine.lastData ?? null,
  };
}

function markMachineOnline(
  machineId,
  machineData = null
) {
  const normalizedId =
    normalizeMachineId(machineId);

  if (!normalizedId) {
    console.warn(
      "Identifiant machine invalide :",
      machineId
    );

    return null;
  }

  const previousState =
    connectedMachines.get(
      normalizedId
    );

  const wasOnline =
    previousState?.online === true;

  const now = Date.now();

  const nextState = {
    online: true,
    lastSeen: now,
    lastData:
      machineData ??
      previousState?.lastData ??
      null,
  };

  connectedMachines.set(
    normalizedId,
    nextState
  );

  /*
   * On envoie machine:online seulement
   * lors du passage hors ligne → en ligne.
   */
  if (!wasOnline) {
    io.to(
      getMachineRoom(
        normalizedId
      )
    ).emit(
      "machine:online",
      {
        machineId:
          normalizedId,

        online: true,

        timestamp:
          new Date(
            now
          ).toISOString(),
      }
    );

    console.log(
      `Machine ${normalizedId} en ligne`
    );
  }

  /*
   * Lorsqu’il y a de nouvelles mesures,
   * elles sont immédiatement envoyées
   * au Dashboard.
   */
  if (
    machineData &&
    typeof machineData ===
      "object"
  ) {
    io.to(
      getMachineRoom(
        normalizedId
      )
    ).emit(
      "machine:update",
      {
        ...machineData,

        machineId:
          normalizedId,

        online: true,

        status: "online",

        timestamp:
          machineData.timestamp ??
          new Date(
            now
          ).toISOString(),
      }
    );
  }

  return nextState;
}

function markMachineOffline(
  machineId,
  reason = "timeout"
) {
  const normalizedId =
    normalizeMachineId(machineId);

  if (!normalizedId) {
    return;
  }

  const previousState =
    connectedMachines.get(
      normalizedId
    );

  if (
    !previousState ||
    previousState.online !== true
  ) {
    return;
  }

  const now = Date.now();

  connectedMachines.set(
    normalizedId,
    {
      ...previousState,
      online: false,
    }
  );

  io.to(
    getMachineRoom(
      normalizedId
    )
  ).emit(
    "machine:offline",
    {
      machineId:
        normalizedId,

      online: false,

      reason,

      timestamp:
        new Date(
          now
        ).toISOString(),
    }
  );

  console.log(
    `Machine ${normalizedId} hors ligne : ${reason}`
  );
}

/*
 * Ces fonctions seront utilisées dans
 * machineRoutes ou dans le contrôleur
 * qui reçoit les mesures de l’ESP32.
 */
app.set(
  "markMachineOnline",
  markMachineOnline
);

app.set(
  "markMachineOffline",
  markMachineOffline
);

app.set(
  "getMachinePresence",
  getMachinePresence
);

app.set(
  "connectedMachines",
  connectedMachines
);

/*
 * Vérification automatique des machines.
 */
const machinePresenceTimer =
  setInterval(() => {
    const now = Date.now();

    for (
      const [
        machineId,
        machine,
      ] of connectedMachines.entries()
    ) {
      if (!machine.online) {
        continue;
      }

      const elapsed =
        now -
        machine.lastSeen;

      if (
        elapsed >=
        MACHINE_OFFLINE_DELAY
      ) {
        markMachineOffline(
          machineId,
          "absence de données"
        );
      }
    }
  }, MACHINE_CHECK_INTERVAL);

machinePresenceTimer.unref();

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
    message:
      "Serveur Diagnostic Machine actif",
    timestamp:
      new Date().toISOString(),
  });
});

/*
 * ===============================
 * ROUTE DE TEST
 * ===============================
 */

app.get(
  "/api/health",
  (req, res) => {
    const onlineMachines =
      Array.from(
        connectedMachines.entries()
      )
        .filter(
          ([
            machineId,
          ]) =>
            getMachinePresence(
              machineId
            ).online
        )
        .map(
          ([machineId]) =>
            machineId
        );

    res.json({
      success: true,

      server: "online",

      database:
        databaseConnected
          ? "connected"
          : "disconnected",

      onlineMachines,

      onlineMachineCount:
        onlineMachines.length,

      timestamp:
        new Date().toISOString(),
    });
  }
);

/*
 * Route légère pour connaître le statut
 * d’une machine sans interroger MySQL.
 */
app.get(
  "/api/machines/:machineId/status",
  (req, res) => {
    const machineId =
      normalizeMachineId(
        req.params.machineId
      );

    if (!machineId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant machine invalide",
      });
    }

    const presence =
      getMachinePresence(
        machineId
      );

    return res.json({
      success: true,

      machineId,

      online:
        presence.online,

      status:
        presence.online
          ? "online"
          : "offline",

      lastSeen:
        presence.lastSeen
          ? new Date(
              presence.lastSeen
            ).toISOString()
          : null,
    });
  }
);

/*
 * ===============================
 * ROUTES API
 * ===============================
 */

app.use(
  "/api",
  machineRoutes
);

app.use(
  "/api/alerts",
  alertRoutes
);

app.use(
  "/api/thresholds",
  thresholdRoutes
);

app.use(
  "/api/configuration",
  configurationRoutes
);

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
    message:
      "Route API introuvable",
    method: req.method,
    path: req.originalUrl,
  });
});

/*
 * ===============================
 * GESTION DES ERREURS
 * ===============================
 */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Erreur serveur :",
      error
    );

    if (
      error.message?.startsWith(
        "Origine non autorisée par CORS"
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur interne du serveur",
      details:
        error.message,
    });
  }
);

/*
 * ===============================
 * SOCKET.IO
 * ===============================
 */

io.on(
  "connection",
  (socket) => {
    console.log(
      "Client Socket.IO connecté :",
      socket.id
    );

    /*
     * Cela confirme seulement que le navigateur
     * est connecté au serveur.
     *
     * Cela ne signifie pas qu’une machine
     * est en ligne.
     */
    socket.emit(
      "server:connected",
      {
        success: true,
        socketId:
          socket.id,
        timestamp:
          new Date().toISOString(),
      }
    );

    /*
     * Le Dashboard rejoint la salle
     * correspondant à la machine sélectionnée.
     */
    socket.on(
      "machine:join",
      ({
        machineId,
      } = {}) => {
        const normalizedId =
          normalizeMachineId(
            machineId
          );

        if (!normalizedId) {
          socket.emit(
            "machine:error",
            {
              message:
                "Identifiant machine invalide",
            }
          );

          return;
        }

        const room =
          getMachineRoom(
            normalizedId
          );

        socket.join(room);

        const presence =
          getMachinePresence(
            normalizedId
          );

        /*
         * Le Dashboard reçoit immédiatement
         * le véritable statut en mémoire.
         */
        socket.emit(
          presence.online
            ? "machine:online"
            : "machine:offline",
          {
            machineId:
              normalizedId,

            online:
              presence.online,

            status:
              presence.online
                ? "online"
                : "offline",

            lastSeen:
              presence.lastSeen
                ? new Date(
                    presence.lastSeen
                  ).toISOString()
                : null,

            timestamp:
              new Date().toISOString(),
          }
        );

        /*
         * Si la machine est en ligne et que
         * le serveur possède déjà ses dernières
         * données, il les envoie sans lire MySQL.
         */
        if (
          presence.online &&
          presence.lastData
        ) {
          socket.emit(
            "machine:update",
            {
              ...presence.lastData,

              machineId:
                normalizedId,

              online: true,

              status:
                "online",
            }
          );
        }
      }
    );

    socket.on(
      "machine:leave",
      ({
        machineId,
      } = {}) => {
        const normalizedId =
          normalizeMachineId(
            machineId
          );

        if (!normalizedId) {
          return;
        }

        socket.leave(
          getMachineRoom(
            normalizedId
          )
        );
      }
    );

    socket.on(
      "machine:status",
      ({
        machineId,
      } = {}) => {
        const normalizedId =
          normalizeMachineId(
            machineId
          );

        if (!normalizedId) {
          return;
        }

        const presence =
          getMachinePresence(
            normalizedId
          );

        socket.emit(
          presence.online
            ? "machine:online"
            : "machine:offline",
          {
            machineId:
              normalizedId,

            online:
              presence.online,

            status:
              presence.online
                ? "online"
                : "offline",

            lastSeen:
              presence.lastSeen
                ? new Date(
                    presence.lastSeen
                  ).toISOString()
                : null,

            timestamp:
              new Date().toISOString(),
          }
        );
      }
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "Client Socket.IO déconnecté :",
          socket.id,
          reason
        );

        /*
         * On ne met pas la machine hors ligne ici.
         *
         * Ce socket peut simplement être celui
         * du navigateur.
         */
      }
    );
  }
);

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
    databaseConnected =
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
          "Présence : OK"
        );
        console.log(
          "===================================="
        );
      }
    );
  } catch (error) {
    databaseConnected = false;

    console.error("");
    console.error(
      "Échec du démarrage du serveur :",
      error
    );

    process.exit(1);
  }
}

startServer();
