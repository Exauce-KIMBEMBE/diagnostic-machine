import {
  machineState,
} from "../models/machineState.js";

import {
  getMeasurementHistory,
  getMeasurementHistoryByPeriod,
} from "../services/historyService.js";

import {
  checkLineAlerts,
  checkTemperatureAlerts,
  checkFlowAlerts,
  checkTankAlerts,
} from "../services/alertService.js";

import {
  saveMeasurement,
} from "../services/measurementService.js";

import {
  saveAlerts,
} from "../services/alertHistoryService.js";

/*
 * ===============================
 * FONCTIONS UTILITAIRES
 * ===============================
 */

function toNumber(
  value,
  defaultValue = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : defaultValue;
}

//======================================================

function getMachineId(
  value
) {
  const machineId =
    Number(value);

  if (
    !Number.isInteger(
      machineId
    ) ||
    machineId <= 0
  ) {
    return null;
  }

  return machineId;
}

//======================================================

function extractMachineId(
  data = {}
) {
  return getMachineId(
    data.machineId ??
      data.machine_id ??
      data.idMachine ??
      data.machine?.id
  );
}

//======================================================

function getHistoryLimit(
  value
) {
  const limit =
    Number(value);

  if (
    !Number.isInteger(
      limit
    ) ||
    limit <= 0
  ) {
    return 100;
  }

  return Math.min(
    limit,
    1000
  );
}

//======================================================

function normalizePercentage(
  value
) {
  return Math.min(
    100,
    Math.max(
      0,
      toNumber(value)
    )
  );
}

//======================================================

function pushAlerts(
  destination,
  alerts
) {
  if (
    Array.isArray(
      alerts
    )
  ) {
    destination.push(
      ...alerts
    );
  }
}

//======================================================
// CRÉATION D'UN ÉTAT INDÉPENDANT
//======================================================

function createMachineState(
  machineId
) {
  /*
   * IMPORTANT :
   *
   * On ne travaille pas directement
   * sur l'objet global machineState.
   *
   * Chaque mesure reçue construit
   * son propre état.
   *
   * Cela évite qu'une machine écrase
   * les informations d'une autre.
   */

  return {
    ...machineState,

    machineId,

    online:
      true,

    status:
      "online",

    lines: {
      L1: {
        ...(
          machineState.lines
            ?.L1 ??
          {}
        ),
      },

      L2: {
        ...(
          machineState.lines
            ?.L2 ??
          {}
        ),
      },

      L3: {
        ...(
          machineState.lines
            ?.L3 ??
          {}
        ),
      },
    },

    temperature: {
      ...(
        machineState.temperature ??
        {}
      ),
    },

    flow: {
      ...(
        machineState.flow ??
        {}
      ),
    },

    tank: {
      ...(
        machineState.tank ??
        {}
      ),
    },

    alerts: [],
  };
}

//======================================================
// ROOM SOCKET.IO MACHINE
//======================================================

function getMachineRoom(
  machineId
) {
  return `machine:${machineId}`;
}

/*
 * ===============================
 * ÉTAT ACTUEL DE LA MACHINE
 * ===============================
 */

export function getMachineState(
  req,
  res
) {
  try {
    /*
     * requireMachineAccess a déjà :
     *
     * - validé machineId
     * - vérifié les permissions
     * - placé l'identifiant dans
     *   req.machineId
     */

    const machineId =
      getMachineId(
        req.machineId
      );

    if (!machineId) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Identifiant machine invalide",
        });
    }

    //==================================================
    // PRÉSENCE EN MÉMOIRE
    //==================================================

    const getMachinePresence =
      req.app.get(
        "getMachinePresence"
      );

    if (
      typeof getMachinePresence !==
      "function"
    ) {
      return res.json({
        success:
          true,

        machineId,

        online:
          false,

        status:
          "offline",

        lastSeen:
          null,

        data:
          null,
      });
    }

    const presence =
      getMachinePresence(
        machineId
      );

    //==================================================
    // MACHINE HORS LIGNE
    //==================================================

    if (
      !presence.online
    ) {
      return res.json({
        success:
          true,

        machineId,

        online:
          false,

        status:
          "offline",

        lastSeen:
          presence.lastSeen
            ? new Date(
                presence.lastSeen
              ).toISOString()
            : null,

        data:
          presence.lastData ??
          null,
      });
    }

    //==================================================
    // MACHINE EN LIGNE
    //==================================================

    return res.json({
      success:
        true,

      machineId,

      online:
        true,

      status:
        "online",

      lastSeen:
        presence.lastSeen
          ? new Date(
              presence.lastSeen
            ).toISOString()
          : null,

      data:
        presence.lastData ??
        null,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur récupération état machine :",
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Impossible de récupérer l'état de la machine",
      });
  }
}

/*
 * ===============================
 * MESURES ENVOYÉES PAR L'ESP32
 * ===============================
 */

export async function receiveMeasurements(
  req,
  res
) {
  try {
    const data =
      req.body ??
      {};

    //==================================================
    // MACHINE
    //==================================================

    const machineId =
      extractMachineId(
        data
      );

    if (!machineId) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Identifiant machine manquant ou invalide",
        });
    }

    //==================================================
    // ÉTAT INDÉPENDANT DE CETTE MACHINE
    //==================================================

    const currentState =
      createMachineState(
        machineId
      );

    const allAlerts =
      [];

    const lines = [
      "L1",
      "L2",
      "L3",
    ];

    /*
     * ===============================
     * MESURES ÉLECTRIQUES
     * ===============================
     */

    for (
      const lineName
      of lines
    ) {
      const lineData =
        data.lines?.[
          lineName
        ];

      //================================================
      // LIGNE ABSENTE
      //================================================

      if (
        !lineData ||
        typeof lineData !==
          "object"
      ) {
        currentState.lines[
          lineName
        ] = {
          ...currentState
            .lines[
              lineName
            ],

          status:
            "offline",
        };

        continue;
      }

      //================================================
      // NORMALISATION
      //================================================

      const normalizedLine = {
        voltage:
          toNumber(
            lineData.voltage
          ),

        current:
          toNumber(
            lineData.current
          ),

        power:
          toNumber(
            lineData.power
          ),

        energy:
          toNumber(
            lineData.energy
          ),

        frequency:
          toNumber(
            lineData.frequency
          ),

        powerFactor:
          toNumber(
            lineData.powerFactor ??
              lineData.pf
          ),
      };

      //================================================
      // ALERTES
      //================================================

      const result =
        checkLineAlerts(
          lineName,
          normalizedLine
        );

      currentState.lines[
        lineName
      ] = {
        ...normalizedLine,

        status:
          result?.status ??
          "normal",
      };

      pushAlerts(
        allAlerts,
        result?.alerts
      );
    }

    /*
     * ===============================
     * TEMPÉRATURE
     * ===============================
     */

    const temperatureValue =
      toNumber(
        data.temperature?.value ??
          data.temperature
      );

    const temperatureResult =
      checkTemperatureAlerts(
        temperatureValue
      );

    currentState.temperature = {
      value:
        temperatureValue,

      status:
        temperatureResult?.status ??
        "normal",
    };

    pushAlerts(
      allAlerts,
      temperatureResult
        ?.alerts
    );

    /*
     * ===============================
     * DÉBIT
     * ===============================
     */

    const flowValue =
      toNumber(
        data.flow?.value ??
          data.flow?.flowRate ??
          data.flowRate ??
          data.flow
      );

    const flowResult =
      checkFlowAlerts(
        flowValue
      );

    currentState.flow = {
      value:
        flowValue,

      status:
        flowResult?.status ??
        "normal",
    };

    pushAlerts(
      allAlerts,
      flowResult?.alerts
    );

    /*
     * ===============================
     * RÉSERVOIR
     * ===============================
     */

    const tankData =
      data.tank ??
      data.reservoir ??
      {};

    const distanceCm =
      toNumber(
        tankData.distanceCm ??
          tankData.distance
      );

    const levelCm =
      toNumber(
        tankData.levelCm ??
          tankData.liquidHeightCm ??
          tankData.heightCm
      );

    const levelPercent =
      normalizePercentage(
        tankData.levelPercent ??
          tankData.percentage ??
          tankData.percent
      );

    const volumeLiters =
      toNumber(
        tankData.volumeLiters ??
          tankData.volume ??
          tankData.liters
      );

    const tankResult =
      checkTankAlerts({
        distanceCm,
        levelCm,
        levelPercent,
        volumeLiters,
      });

    currentState.tank = {
      distanceCm,
      levelCm,
      levelPercent,
      volumeLiters,

      status:
        tankResult?.status ??
        "normal",
    };

    pushAlerts(
      allAlerts,
      tankResult?.alerts
    );

    /*
     * ===============================
     * ÉTAT GLOBAL DE CETTE MESURE
     * ===============================
     */

    const timestamp =
      new Date()
        .toISOString();

    currentState.machineId =
      machineId;

    currentState.online =
      true;

    currentState.status =
      "online";

    currentState.alerts =
      allAlerts;

    currentState.timestamp =
      timestamp;

    /*
     * ===============================
     * ENREGISTREMENT MYSQL
     * ===============================
     */

    const measurementId =
      await saveMeasurement(
        currentState,
        machineId
      );

    //==================================================
    // ALERTES
    //==================================================

    if (
      allAlerts.length >
      0
    ) {
      await saveAlerts(
        allAlerts,
        machineId
      );
    }

    /*
     * ===============================
     * PRÉSENCE ET SOCKET.IO
     * ===============================
     */

    const markMachineOnline =
      req.app.get(
        "markMachineOnline"
      );

    const socketData = {
      ...currentState,

      machineId,

      measurementId,

      online:
        true,

      status:
        "online",

      timestamp,
    };

    if (
      typeof markMachineOnline ===
      "function"
    ) {
      /*
       * index.js stocke maintenant
       * ces données dans :
       *
       * connectedMachines.get(machineId)
       *
       * Donc chaque machine possède
       * son propre lastData.
       */

      markMachineOnline(
        machineId,
        socketData
      );
    } else {
      //================================================
      // FALLBACK SOCKET.IO
      //================================================

      const io =
        req.app.get(
          "io"
        );

      if (io) {
        io
          .to(
            getMachineRoom(
              machineId
            )
          )
          .emit(
            "machine:update",
            socketData
          );
      }
    }

    //==================================================
    // RÉPONSE
    //==================================================

    return res
      .status(201)
      .json({
        success:
          true,

        message:
          "Mesures reçues et enregistrées",

        machineId,

        measurementId,

        data: {
          ...currentState,
        },
      });
  } catch (
    error
  ) {
    console.error(
      "Erreur lors de la réception des mesures :",
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Erreur lors du traitement ou de l'enregistrement des mesures",

        details:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/*
 * ===============================
 * HISTORIQUE
 * ===============================
 */

export async function getHistory(
  req,
  res
) {
  try {
    const limit =
      getHistoryLimit(
        req.query.limit
      );

    /*
     * IMPORTANT :
     *
     * requireMachineAccess a déjà
     * validé et autorisé cette machine.
     *
     * On ne reprend donc PAS
     * directement req.query.machineId.
     */

    const machineId =
      getMachineId(
        req.machineId
      );

    if (!machineId) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Identifiant machine invalide",
        });
    }

    const history =
      await getMeasurementHistory(
        limit,
        machineId
      );

    return res.json({
      success:
        true,

      machineId,

      count:
        history.length,

      data:
        history,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur récupération historique :",
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Impossible de récupérer l'historique",

        details:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/*
 * ===============================
 * HISTORIQUE PAR PÉRIODE
 * ===============================
 */

export async function getHistoryByPeriod(
  req,
  res
) {
  try {
    const period =
      String(
        req.query.period ??
          "24h"
      ).toLowerCase();

    const allowedPeriods = [
      "1h",
      "24h",
      "7d",
      "30d",
    ];

    if (
      !allowedPeriods.includes(
        period
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Période invalide. Valeurs autorisées : 1h, 24h, 7d, 30d",
        });
    }

    /*
     * Comme pour getHistory(),
     * on utilise l'identifiant validé
     * par requireMachineAccess.
     */

    const machineId =
      getMachineId(
        req.machineId
      );

    if (!machineId) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Identifiant machine invalide",
        });
    }

    const history =
      await getMeasurementHistoryByPeriod(
        period,
        machineId
      );

    return res.json({
      success:
        true,

      machineId,

      period,

      count:
        history.length,

      data:
        history,
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur récupération historique par période :",
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Impossible de récupérer l'historique demandé",

        details:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}
