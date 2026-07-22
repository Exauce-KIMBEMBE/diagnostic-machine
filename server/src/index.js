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

const PORT = Number(
  process.env.PORT || 3001
);

/*
 * ===============================
 * PRÉSENCE DES MACHINES
 * ===============================
 */

/*
 * Une machine est considérée hors ligne
 * après 30 secondes sans nouvelle mesure.
 */
const MACHINE_OFFLINE_DELAY = 30_000;

/*
 * Le serveur vérifie l’état des machines
 * toutes les 5 secondes.
 */
const MACHINE_CHECK_INTERVAL = 5_000;

/*
 * Stockage temporaire en mémoire.
 *
 * Map<
 *   machineId,
 *   {
 *     online: boolean,
 *     lastSeen: number,
 *     lastData: object | null
 *   }
 * >
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
  origin(origin, callback) {
    /*
     * Les requêtes provenant de l’ESP32,
     * de Postman ou d’un serveur peuvent
     * ne pas contenir d’en-tête Origin.
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
 * OUTILS DE PRÉSENCE MACHINE
 * ===============================
 */

/*
 * Vérifie et normalise l’identifiant
 * d’une machine.
 */
function normalizeMachineId(
  machineId
) {
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

/*
 * Retourne le nom de la salle Socket.IO
 * d’une machine.
 */
function getMachineRoom(
  machineId
) {
  return `machine:${machineId}`;
}

/*
 * Récupère l’identifiant machine
 * depuis plusieurs formats possibles.
 */
function extractMachineId(
  data = {}
) {
  return normalizeMachineId(
    data.machineId ??
      data.machine_id ??
      data.idMachine ??
      data.machine?.id
  );
}

/*
 * Retourne l’état actuel d’une machine
 * sans consulter la base de données.
 */
function getMachinePresence(
  machineId
) {
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

  const online =
    machine.online === true &&
    Date.now() -
      machine.lastSeen <
      MACHINE_OFFLINE_DELAY;

  return {
    machineId: normalizedId,
    online,
    lastSeen:
      machine.lastSeen,
    lastData:
      machine.lastData ??
      null,
  };
}

/*
 * Déclare une machine en ligne.
 *
 * Cette fonction est appelée
 * lorsqu’une nouvelle mesure est reçue.
 */
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

  /*
   * Une machine peut être encore marquée
   * online dans la Map alors que son délai
   * est déjà dépassé.
   */
  const wasOnline =
    previousState?.online === true &&
    Date.now() -
      previousState.lastSeen <
      MACHINE_OFFLINE_DELAY;

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
   * machine:online est envoyé uniquement
   * lors du passage hors ligne vers en ligne.
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

        status: "online",

        lastSeen:
          new Date(
            now
          ).toISOString(),

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
   * Les nouvelles données sont immédiatement
   * envoyées au Dashboard.
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

/*
 * Déclare une machine hors ligne.
 */
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

      status: "offline",

      reason,

      lastSeen:
        previousState.lastSeen
          ? new Date(
              previousState.lastSeen
            ).toISOString()
          : null,

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
 * Les routes et les contrôleurs
 * peuvent récupérer ces fonctions
 * avec req.app.get(...).
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

/*
 * Empêche le timer de garder
 * le processus Node.js ouvert tout seul.
 */
machinePresenceTimer.unref();

/*
 * ===============================
 * MIDDLEWARES
 * ===============================
 */

app.use(
  cors(corsOptions)
);

app.options(
  "*",
  cors(corsOptions)
);

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
 * DÉTECTION DES MESURES ESP32
 * ===============================
 */

/*
 * Ce middleware intercepte :
 *
 * POST /api/measurements
 *
 * La machine est déclarée en ligne
 * uniquement si l’enregistrement de la mesure
 * s’est terminé avec un statut HTTP réussi.
 *
 * Une mesure invalide ou refusée ne doit pas
 * faire apparaître la machine comme connectée.
 */
app.use(
  "/api/measurements",
  (
    req,
    res,
    next
  ) => {
    if (
      req.method !== "POST"
    ) {
      return next();
    }

    const machineId =
      extractMachineId(
        req.body
      );

    if (!machineId) {
      return next();
    }

    res.on(
      "finish",
      () => {
        if (
          res.statusCode >= 200 &&
          res.statusCode < 300
        ) {
          markMachineOnline(
            machineId,
            req.body
          );
        }
      }
    );

    return next();
  }
);

/*
 * ===============================
 * ROUTE PRINCIPALE
 * ===============================
 */

app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,

      message:
        "Serveur Diagnostic Machine actif",

      timestamp:
        new Date().toISOString(),
    });
  }
);

/*
 * ===============================
 * ROUTE DE TEST DU SERVEUR
 * ===============================
 */

app.get(
  "/api/health",
  (req, res) => {
    const onlineMachines =
      Array.from(
        connectedMachines.keys()
      ).filter(
        (machineId) =>
          getMachinePresence(
            machineId
          ).online
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
 * ===============================
 * STATUT D’UNE MACHINE
 * ===============================
 */

app.get(
  "/api/machines/:machineId/status",
  (
    req,
    res
  ) => {
    const machineId =
      normalizeMachineId(
        req.params.machineId
      );

    if (!machineId) {
      return res.status(
        400
      ).json({
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

app.use(
  (req, res) => {
    res.status(
      404
    ).json({
      success: false,

      message:
        "Route API introuvable",

      method:
        req.method,

      path:
        req.originalUrl,
    });
  }
);

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
      return res.status(
        403
      ).json({
        success: false,

        message:
          error.message,
      });
    }

    return res.status(
      500
    ).json({
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
 * ÉVÉNEMENTS SOCKET.IO
 * ===============================
 */

io.on(
  "connection",
  (socket) => {
    console.log(
      "Client Socket.IO connecté :",
      socket.id
    );

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

    socket.on(
      "machine:join",
      (
        {
          machineId,
        } = {}
      ) => {
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
      (
        {
          machineId,
        } = {}
      ) => {
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
      (
        {
          machineId,
        } = {}
      ) => {
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
         * On ne déclare pas la machine
         * hors ligne ici.
         *
         * Ce socket appartient normalement
         * au navigateur et non à l’ESP32.
         */
      }
    );
  }
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
