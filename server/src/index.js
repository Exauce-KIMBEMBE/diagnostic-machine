import "dotenv/config";

import express from "express";
import cors from "cors";
import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import machineRoutes from "./routes/machineRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import thresholdRoutes from "./routes/thresholdRoutes.js";
import configurationRoutes from "./routes/configurationRoutes.js";
import firmwareRoutes from "./routes/firmwareRoutes.js";
import authRoutes from "./routes/authRoutes.js";

import {
  pool,
  testDatabaseConnection,
} from "./config/database.js";

import {
  initializeDatabase,
} from "./config/initDatabase.js";

//======================================================
// APPLICATION
//======================================================

const app = express();

const server =
  http.createServer(app);

const PORT =
  Number(
    process.env.PORT ||
      3001
  );

//======================================================
// PRÉSENCE DES MACHINES
//======================================================

const MACHINE_OFFLINE_DELAY =
  30_000;

const MACHINE_CHECK_INTERVAL =
  5_000;

const connectedMachines =
  new Map();

let databaseConnected =
  false;

//======================================================
// CORS
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
     * ESP32, Postman et certaines
     * requêtes serveur n'envoient
     * pas forcément Origin.
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
      cors:
        corsOptions,
    }
  );

app.set(
  "io",
  io
);

//======================================================
// OUTILS
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
// JWT
//======================================================

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET manquant dans le fichier .env"
    );
  }

  return secret;
}

//======================================================
// PRÉSENCE MACHINE
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
      machineId:
        null,

      online:
        false,

      lastSeen:
        null,

      lastData:
        null,
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

      online:
        false,

      lastSeen:
        null,

      lastData:
        null,
    };
  }

  const online =
    machine.online ===
      true &&
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
    online:
      true,

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

  if (!wasOnline) {
    io
      .to(
        getMachineRoom(
          normalizedId
        )
      )
      .emit(
        "machine:online",
        {
          machineId:
            normalizedId,

          online:
            true,

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

  //====================================================
  // MESURES TEMPS RÉEL
  //====================================================

  if (
    machineData &&
    typeof machineData ===
      "object"
  ) {
    io
      .to(
        getMachineRoom(
          normalizedId
        )
      )
      .emit(
        "machine:update",
        {
          ...machineData,

          machineId:
            normalizedId,

          online:
            true,

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
      online:
        false,
    }
  );

  io
    .to(
      getMachineRoom(
        normalizedId
      )
    )
    .emit(
      "machine:offline",
      {
        machineId:
          normalizedId,

        online:
          false,

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
// VÉRIFICATION ACCÈS SOCKET À UNE MACHINE
//======================================================

async function canSocketAccessMachine(
  socket,
  machineId
) {
  const normalizedId =
    normalizeMachineId(
      machineId
    );

  if (!normalizedId) {
    return false;
  }

  const user =
    socket.data.user;

  if (!user) {
    return false;
  }

  //====================================================
  // MANAGER
  //====================================================

  if (
    user.role ===
    "manager"
  ) {
    return true;
  }

  //====================================================
  // CLIENT
  //====================================================

  if (
    user.role !==
    "client"
  ) {
    return false;
  }

  const [
    rows,
  ] =
    await pool.query(
      `
      SELECT
        machine_id

      FROM user_machines

      WHERE user_id = ?
        AND machine_id = ?

      LIMIT 1
      `,
      [
        user.id,
        normalizedId,
      ]
    );

  return (
    rows.length >
    0
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
// SURVEILLANCE AUTOMATIQUE
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

machinePresenceTimer.unref();

//======================================================
// MIDDLEWARES EXPRESS
//======================================================

app.use(
  cors(
    corsOptions
  )
);

app.use(
  express.json({
    limit:
      "1mb",
  })
);

app.use(
  express.urlencoded({
    extended:
      true,
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
    return res.json({
      success:
        true,

      message:
        "Serveur Diagnostic Machine actif",

      timestamp:
        new Date()
          .toISOString(),
    });
  }
);

//======================================================
// HEALTH
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

    return res.json({
      success:
        true,

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
        new Date()
          .toISOString(),
    });
  }
);

//======================================================
// AUTHENTIFICATION
//======================================================

/*
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */

app.use(
  "/api/auth",
  authRoutes
);

//======================================================
// ROUTES MACHINE
//======================================================

app.use(
  "/api",
  machineRoutes
);

//======================================================
// ALERTES
//======================================================

app.use(
  "/api/alerts",
  alertRoutes
);

//======================================================
// SEUILS
//======================================================

app.use(
  "/api/thresholds",
  thresholdRoutes
);

//======================================================
// CONFIGURATION
//======================================================

app.use(
  "/api/configuration",
  configurationRoutes
);

//======================================================
// FIRMWARE
//======================================================

app.use(
  "/api/firmware",
  firmwareRoutes
);

//======================================================
// SOCKET.IO - AUTHENTIFICATION JWT
//======================================================

io.use(
  (
    socket,
    next
  ) => {
    try {
      /*
       * Le Dashboard devra envoyer :
       *
       * io(API_URL, {
       *   auth: {
       *     token: token
       *   }
       * })
       */

      let token =
        socket.handshake
          ?.auth
          ?.token;

      /*
       * Compatibilité éventuelle avec :
       *
       * Authorization: Bearer ...
       */

      if (!token) {
        const authorization =
          socket.handshake
            ?.headers
            ?.authorization;

        if (
          typeof authorization ===
            "string" &&
          authorization.startsWith(
            "Bearer "
          )
        ) {
          token =
            authorization
              .slice(7)
              .trim();
        }
      }

      if (!token) {
        return next(
          new Error(
            "Authentification Socket.IO requise"
          )
        );
      }

      const decoded =
        jwt.verify(
          token,
          getJwtSecret()
        );

      if (
        !decoded?.id ||
        !decoded?.role
      ) {
        return next(
          new Error(
            "Token Socket.IO invalide"
          )
        );
      }

      if (
        ![
          "manager",
          "client",
        ].includes(
          decoded.role
        )
      ) {
        return next(
          new Error(
            "Rôle Socket.IO invalide"
          )
        );
      }

      socket.data.user = {
        id:
          Number(
            decoded.id
          ),

        name:
          decoded.name ??
          null,

        email:
          decoded.email ??
          null,

        role:
          decoded.role,
      };

      return next();
    } catch (error) {
      console.warn(
        "Connexion Socket.IO refusée :",
        error.message
      );

      return next(
        new Error(
          "Authentification Socket.IO invalide"
        )
      );
    }
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
    const user =
      socket.data.user;

    console.log(
      `Socket.IO connecté : ${socket.id} - utilisateur ${user.id} (${user.role})`
    );

    socket.emit(
      "server:connected",
      {
        success:
          true,

        socketId:
          socket.id,

        user: {
          id:
            user.id,

          role:
            user.role,
        },

        timestamp:
          new Date()
            .toISOString(),
      }
    );

    //==================================================
    // REJOINDRE UNE MACHINE
    //==================================================

    socket.on(
      "machine:join",
      async (
        {
          machineId,
        } = {}
      ) => {
        try {
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

          //============================================
          // AUTORISATION
          //============================================

          const allowed =
            await canSocketAccessMachine(
              socket,
              normalizedId
            );

          if (!allowed) {
            console.warn(
              `Socket ${socket.id} : accès refusé à la machine ${normalizedId}`
            );

            socket.emit(
              "machine:error",
              {
                machineId:
                  normalizedId,

                message:
                  "Accès refusé à cette machine",
              }
            );

            return;
          }

          //============================================
          // ROOM
          //============================================

          const room =
            getMachineRoom(
              normalizedId
            );

          await socket.join(
            room
          );

          console.log(
            `Utilisateur ${user.id} rejoint ${room}`
          );

          //============================================
          // PRÉSENCE
          //============================================

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
                new Date()
                  .toISOString(),
            }
          );

          //============================================
          // DERNIÈRE MESURE
          //============================================

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
        } catch (error) {
          console.error(
            "Erreur machine:join :",
            error
          );

          socket.emit(
            "machine:error",
            {
              message:
                "Impossible de rejoindre la machine",
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

    //==================================================
    // STATUT MACHINE
    //==================================================

    socket.on(
      "machine:status",
      async (
        {
          machineId,
        } = {}
      ) => {
        try {
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

          const allowed =
            await canSocketAccessMachine(
              socket,
              normalizedId
            );

          if (!allowed) {
            socket.emit(
              "machine:error",
              {
                machineId:
                  normalizedId,

                message:
                  "Accès refusé à cette machine",
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
                new Date()
                  .toISOString(),
            }
          );
        } catch (error) {
          console.error(
            "Erreur machine:status :",
            error
          );

          socket.emit(
            "machine:error",
            {
              message:
                "Impossible de récupérer le statut de la machine",
            }
          );
        }
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
      }
    );
  }
);

//======================================================
// ROUTE INTROUVABLE
//======================================================

app.use(
  (
    req,
    res
  ) => {
    return res
      .status(404)
      .json({
        success:
          false,

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
        .status(403)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Erreur interne du serveur",

        details:
          error.message,
      });
  }
);

//======================================================
// DÉMARRAGE
//======================================================

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
          "SocketIO : JWT sécurisé"
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
  } catch (error) {
    databaseConnected =
      false;

    console.error("");

    console.error(
      "Échec du démarrage du serveur :",
      error
    );

    process.exit(1);
  }
}

startServer();
