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

/*
 * NOUVEAU :
 * Routes d'authentification
 */
import authRoutes from "./routes/authRoutes.js";

import {
  testDatabaseConnection,
} from "./config/database.js";

import {
  initializeDatabase,
} from "./config/initDatabase.js";

const app = express();

const server =
  http.createServer(app);

const PORT = Number(
  process.env.PORT || 3001
);

//======================================================
// PRÉSENCE DES MACHINES
//======================================================

/*
 * Une machine est considérée hors ligne
 * après 30 secondes sans nouvelle mesure.
 */
const MACHINE_OFFLINE_DELAY =
  30_000;

/*
 * Le serveur vérifie l’état des machines
 * toutes les 5 secondes.
 */
const MACHINE_CHECK_INTERVAL =
  5_000;

/*
 * Stockage temporaire de l'état
 * des machines en mémoire.
 */
const connectedMachines =
  new Map();

let databaseConnected =
  false;

//======================================================
// CONFIGURATION CORS
//======================================================

const allowedOrigins = [
  "http://localhost:5173",
  "https://diagnostic-machine-fs2m.onrender.com",
];

const corsOptions = {
  origin(
    origin,
    callback
  ) {
    /*
     * ESP32, Postman et certaines requêtes
     * serveur peuvent ne pas envoyer Origin.
     */
    if (
      !origin ||
      allowedOrigins.includes(
        origin
      )
    ) {
      return callback(
        null,
        true
      );
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

//======================================================
// SOCKET.IO
//======================================================

const io =
  new Server(
    server,
    {
      cors: corsOptions,
    }
  );

/*
 * Permet aux routes d'utiliser :
 *
 * req.app.get("io")
 */
app.set(
  "io",
  io
);

//======================================================
// OUTILS DE PRÉSENCE MACHINE
//======================================================

function normalizeMachineId(
  machineId
) {
  const normalizedId =
    Number(
      machineId
    );

  if (
    !Number.isInteger(
      normalizedId
    ) ||
    normalizedId <= 0
  ) {
    return null;
  }

  return normalizedId;
}

//======================================================

function getMachineRoom(
  machineId
) {
  return `machine:${machineId}`;
}

//======================================================

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

//======================================================

function getMachinePresence(
  machineId
) {
  const normalizedId =
    normalizeMachineId(
      machineId
    );

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
      machineId:
        normalizedId,

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
    machineId:
      normalizedId,

    online,

    lastSeen:
      machine.lastSeen,

    lastData:
      machine.lastData ??
      null,
  };
}

//======================================================
// MACHINE EN LIGNE
//======================================================

function markMachineOnline(
  machineId,
  machineData = null
) {
  const normalizedId =
    normalizeMachineId(
      machineId
    );

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
    previousState?.online ===
      true &&
    Date.now() -
      previousState.lastSeen <
      MACHINE_OFFLINE_DELAY;

  const now =
    Date.now();

  const nextState = {
    online: true,

    lastSeen:
      now,

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
   * Émission uniquement lorsque la machine
   * passe réellement hors ligne -> en ligne.
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

        status:
          "online",

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
   * Envoi immédiat des nouvelles mesures
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

        status:
          "online",

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

//======================================================
// MACHINE HORS LIGNE
//======================================================

function markMachineOffline(
  machineId,
  reason = "timeout"
) {
  const normalizedId =
    normalizeMachineId(
      machineId
    );

  if (!normalizedId) {
    return;
  }

  const previousState =
    connectedMachines.get(
      normalizedId
    );

  if (
    !previousState ||
    previousState.online !==
      true
  ) {
    return;
  }

  const now =
    Date.now();

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

      status:
        "offline",

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

//======================================================
// OUTILS DISPONIBLES DANS LES ROUTES
//======================================================

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

//======================================================
// SURVEILLANCE AUTOMATIQUE DES MACHINES
//======================================================

const machinePresenceTimer =
  setInterval(
    () => {
      const now =
        Date.now();

      for (
        const [
          machineId,
          machine,
        ] of connectedMachines.entries()
      ) {
        if (
          !machine.online
        ) {
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
    },
    MACHINE_CHECK_INTERVAL
  );

/*
 * Le timer ne doit pas empêcher Node.js
 * de s'arrêter normalement.
 */
machinePresenceTimer.unref();

//======================================================
// MIDDLEWARES
//======================================================

app.use(
  cors(
    corsOptions
  )
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

//======================================================
// DÉTECTION DES MESURES ESP32
//======================================================

app.use(
  "/api/measurements",
  (
    req,
    res,
    next
  ) => {
    if (
      req.method !==
      "POST"
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

    /*
     * On attend que la route ait réellement
     * accepté et enregistré la mesure.
     */
    res.on(
      "finish",
      () => {
        if (
          res.statusCode >=
            200 &&
          res.statusCode <
            300
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

//======================================================
// ROUTE PRINCIPALE
//======================================================

app.get(
  "/",
  (
    req,
    res
  ) => {
    res.json({
      success: true,

      message:
        "Serveur Diagnostic Machine actif",

      timestamp:
        new Date().toISOString(),
    });
  }
);

//======================================================
// TEST DU SERVEUR
//======================================================

app.get(
  "/api/health",
  (
    req,
    res
  ) => {
    const onlineMachines =
      Array.from(
        connectedMachines.keys()
      ).filter(
        (
          machineId
        ) =>
          getMachinePresence(
            machineId
          ).online
      );

    res.json({
      success: true,

      server:
        "online",

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

//======================================================
// STATUT D'UNE MACHINE
//======================================================

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
      return res
        .status(
          400
        )
        .json({
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

//======================================================
// AUTHENTIFICATION
//======================================================

/*
 * Routes prévues :
 *
 * POST /api/auth/login
 * GET  /api/auth/me
 *
 * Plus tard :
 * POST /api/auth/logout
 * POST /api/auth/change-password
 */
app.use(
  "/api/auth",
  authRoutes
);

//======================================================
// ROUTES API MACHINE
//======================================================

app.use(
  "/api",
  machineRoutes
);

//======================================================
// ROUTES ALERTES
//======================================================

app.use(
  "/api/alerts",
  alertRoutes
);

//======================================================
// ROUTES SEUILS
//======================================================

app.use(
  "/api/thresholds",
  thresholdRoutes
);

//======================================================
// ROUTES CONFIGURATION
//======================================================

app.use(
  "/api/configuration",
  configurationRoutes
);

//======================================================
// ROUTES FIRMWARE / OTA
//======================================================

app.use(
  "/api/firmware",
  firmwareRoutes
);

//======================================================
// ROUTE INTROUVABLE
//======================================================

app.use(
  (
    req,
    res
  ) => {
    res
      .status(
        404
      )
      .json({
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

//======================================================
// GESTION DES ERREURS
//======================================================

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
      return res
        .status(
          403
        )
        .json({
          success: false,

          message:
            error.message,
        });
    }

    return res
      .status(
        500
      )
      .json({
        success: false,

        message:
          "Erreur interne du serveur",

        /*
         * On conserve details pour le moment
         * pendant le développement.
         *
         * Plus tard, en production stricte,
         * il faudra éviter de renvoyer certains
         * détails techniques sensibles.
         */
        details:
          error.message,
      });
  }
);

//======================================================
// SOCKET.IO
//======================================================

io.on(
  "connection",
  (
    socket
  ) => {
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

    //==================================================
    // REJOINDRE UNE MACHINE
    //==================================================

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

        if (
          !normalizedId
        ) {
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

        socket.join(
          room
        );

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

        /*
         * Si on possède déjà la dernière mesure,
         * on l'envoie immédiatement au navigateur.
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

              online:
                true,

              status:
                "online",
            }
          );
        }
      }
    );

    //==================================================
    // QUITTER UNE MACHINE
    //==================================================

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

        if (
          !normalizedId
        ) {
          return;
        }

        socket.leave(
          getMachineRoom(
            normalizedId
          )
        );
      }
    );

    //==================================================
    // DEMANDE DU STATUT MACHINE
    //==================================================

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

        if (
          !normalizedId
        ) {
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

    //==================================================
    // DÉCONNEXION
    //==================================================

    socket.on(
      "disconnect",
      (
        reason
      ) => {
        console.log(
          "Client Socket.IO déconnecté :",
          socket.id,
          reason
        );

        /*
         * On ne met PAS une machine hors ligne ici.
         *
         * Cette connexion Socket.IO appartient
         * au navigateur et non à l'ESP32.
         */
      }
    );
  }
);

//======================================================
// DÉMARRAGE DU SERVEUR
//======================================================

async function startServer() {
  try {
    databaseConnected =
      await testDatabaseConnection();

    if (
      !databaseConnected
    ) {
      throw new Error(
        "Impossible de se connecter à la base MySQL"
      );
    }

    /*
     * Création / mise à jour automatique
     * des tables nécessaires.
     *
     * Nous ajouterons également ici
     * la table users dans initDatabase.js.
     */
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
          "Auth     : OK"
        );

        console.log(
          "===================================="
        );
      }
    );
  } catch (
    error
  ) {
    databaseConnected =
      false;

    console.error("");

    console.error(
      "Échec du démarrage du serveur :",
      error
    );

    process.exit(
      1
    );
  }
}

startServer();
