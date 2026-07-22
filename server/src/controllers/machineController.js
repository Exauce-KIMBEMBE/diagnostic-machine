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

function getMachineId(value) {
  const machineId =
    Number(value);

  if (
    !Number.isInteger(machineId) ||
    machineId <= 0
  ) {
    return null;
  }

  return machineId;
}

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

function getHistoryLimit(
  value
) {
  const limit =
    Number(value);

  if (
    !Number.isInteger(limit) ||
    limit <= 0
  ) {
    return 100;
  }

  return Math.min(
    limit,
    1000
  );
}

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

function pushAlerts(
  destination,
  alerts
) {
  if (
    Array.isArray(alerts)
  ) {
    destination.push(
      ...alerts
    );
  }
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
  const requestedMachineId =
    req.query.machineId
      ? getMachineId(
          req.query.machineId
        )
      : null;

  if (
    req.query.machineId &&
    !requestedMachineId
  ) {
    return res.status(
      400
    ).json({
      success: false,
      message:
        "Identifiant machine invalide",
    });
  }

  /*
   * Lecture du statut en mémoire.
   * Aucune requête MySQL n’est effectuée.
   */
  const getMachinePresence =
    req.app.get(
      "getMachinePresence"
    );

  if (
    requestedMachineId &&
    typeof getMachinePresence ===
      "function"
  ) {
    const presence =
      getMachinePresence(
        requestedMachineId
      );

    if (!presence.online) {
      return res.json({
        success: true,
        machineId:
          requestedMachineId,
        online: false,
        status: "offline",
        lastSeen:
          presence.lastSeen
            ? new Date(
                presence.lastSeen
              ).toISOString()
            : null,
        data: null,
      });
    }
  }

  return res.json({
    success: true,

    machineId:
      machineState.machineId ??
      requestedMachineId ??
      null,

    online:
      machineState.online ===
      true,

    status:
      machineState.online ===
      true
        ? "online"
        : "offline",

    data: {
      ...machineState,
    },
  });
}

/*
 * ===============================
 * MESURES ENVOYÉES PAR L’ESP32
 * ===============================
 */

export async function receiveMeasurements(
  req,
  res
) {
  try {
    const data =
      req.body ?? {};

    const machineId =
      extractMachineId(data);

    if (!machineId) {
      return res.status(
        400
      ).json({
        success: false,
        message:
          "Identifiant machine manquant ou invalide",
      });
    }

    const allAlerts = [];

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
      const lineName of lines
    ) {
      const lineData =
        data.lines?.[
          lineName
        ];

      /*
       * La ligne absente est considérée
       * comme indisponible.
       */
      if (
        !lineData ||
        typeof lineData !==
          "object"
      ) {
        machineState.lines[
          lineName
        ] = {
          ...machineState.lines[
            lineName
          ],
          status: "offline",
        };

        continue;
      }

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

      const result =
        checkLineAlerts(
          lineName,
          normalizedLine
        );

      machineState.lines[
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

    machineState.temperature = {
      value:
        temperatureValue,

      status:
        temperatureResult?.status ??
        "normal",
    };

    pushAlerts(
      allAlerts,
      temperatureResult?.alerts
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

    machineState.flow = {
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

    machineState.tank = {
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
     * ÉTAT GLOBAL
     * ===============================
     */

    const timestamp =
      new Date().toISOString();

    machineState.machineId =
      machineId;

    machineState.online =
      true;

    machineState.status =
      "online";

    machineState.alerts =
      allAlerts;

    machineState.timestamp =
      timestamp;

    /*
     * ===============================
     * ENREGISTREMENT MYSQL
     * ===============================
     */

    const measurementId =
      await saveMeasurement(
        machineState,
        machineId
      );

    /*
     * On évite une requête inutile
     * lorsqu’il n’y a aucune alerte.
     */
    if (
      allAlerts.length > 0
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
      ...machineState,
      machineId,
      measurementId,
      online: true,
      status: "online",
      timestamp,
    };

    if (
      typeof markMachineOnline ===
      "function"
    ) {
      /*
       * Met à jour lastSeen et émet :
       *
       * machine:online
       * machine:update
       */
      markMachineOnline(
        machineId,
        socketData
      );
    } else {
      /*
       * Solution de secours si index.js
       * n’a pas enregistré markMachineOnline.
       */
      const io =
        req.app.get("io");

      if (io) {
        io.emit(
          "machine:update",
          socketData
        );
      }
    }

    return res.status(
      201
    ).json({
      success: true,

      message:
        "Mesures reçues et enregistrées",

      machineId,
      measurementId,

      data: {
        ...machineState,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la réception des mesures :",
      error
    );

    return res.status(
      500
    ).json({
      success: false,

      message:
        "Erreur lors du traitement ou de l’enregistrement des mesures",

      details:
        error.message,
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

    const machineId =
      req.query.machineId
        ? getMachineId(
            req.query.machineId
          )
        : null;

    if (
      req.query.machineId &&
      !machineId
    ) {
      return res.status(
        400
      ).json({
        success: false,
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
      success: true,
      machineId,
      count:
        history.length,
      data:
        history,
    });
  } catch (error) {
    console.error(
      "Erreur récupération historique :",
      error
    );

    return res.status(
      500
    ).json({
      success: false,

      message:
        "Impossible de récupérer l’historique",

      details:
        error.message,
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
      return res.status(
        400
      ).json({
        success: false,

        message:
          "Période invalide. Valeurs autorisées : 1h, 24h, 7d, 30d",
      });
    }

    const machineId =
      req.query.machineId
        ? getMachineId(
            req.query.machineId
          )
        : null;

    if (
      req.query.machineId &&
      !machineId
    ) {
      return res.status(
        400
      ).json({
        success: false,
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
      success: true,
      machineId,
      period,
      count:
        history.length,
      data:
        history,
    });
  } catch (error) {
    console.error(
      "Erreur récupération historique par période :",
      error
    );

    return res.status(
      500
    ).json({
      success: false,

      message:
        "Impossible de récupérer l’historique demandé",

      details:
        error.message,
    });
  }
}
