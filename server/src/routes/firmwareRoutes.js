import {
  Router,
} from "express";

import path from "path";
import fs from "fs";
import {
  fileURLToPath,
} from "url";

const router = Router();

//======================================================
// CHEMINS
//======================================================

const currentFile =
  fileURLToPath(
    import.meta.url
  );

const currentDirectory =
  path.dirname(
    currentFile
  );

const versionFilePath =
  path.resolve(
    currentDirectory,
    "../../firmware/version.json"
  );

const firmwareFilePath =
  path.resolve(
    currentDirectory,
    "../../firmware/diagnostic-machine.bin"
  );

//======================================================
// OUTILS
//======================================================

function normalizeMachineId(
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
// VERSION DU FIRMWARE
//======================================================

/*
 * GET /api/firmware
 *
 * Cette route reste accessible à l'ESP32.
 *
 * L'ESP32 l'utilise pour vérifier
 * si une nouvelle version est disponible.
 */

router.get(
  "/",
  (
    req,
    res,
    next
  ) => {
    try {
      //================================================
      // VERSION.JSON
      //================================================

      if (
        !fs.existsSync(
          versionFilePath
        )
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fichier version.json introuvable",
          });
      }

      const versionFileContent =
        fs.readFileSync(
          versionFilePath,
          "utf8"
        );

      const versionData =
        JSON.parse(
          versionFileContent
        );

      const version =
        typeof versionData.version ===
          "string"
          ? versionData.version.trim()
          : "";

      if (!version) {
        throw new Error(
          "La version du firmware est absente dans version.json"
        );
      }

      //================================================
      // FIRMWARE
      //================================================

      if (
        !fs.existsSync(
          firmwareFilePath
        )
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fichier firmware introuvable",
          });
      }

      //================================================
      // URL
      //================================================

      const firmwareUrl =
        `${req.protocol}://${req.get(
          "host"
        )}` +
        "/api/firmware/download";

      //================================================
      // RÉPONSE
      //================================================

      return res.json({
        success: true,
        version,
        url:
          firmwareUrl,
      });
    } catch (error) {
      return next(
        error
      );
    }
  }
);

//======================================================
// PROGRESSION OTA
//======================================================

/*
 * POST /api/firmware/progress
 *
 * Cette route est appelée directement
 * par l'ESP32 pendant une mise à jour OTA.
 *
 * Elle ne doit donc PAS utiliser
 * authenticate / JWT utilisateur.
 *
 * Exemple :
 *
 * {
 *   "machineId": 1,
 *   "status": "downloading",
 *   "progress": 45,
 *   "message": "Téléchargement...",
 *   "version": "1.1.0"
 * }
 */

router.post(
  "/progress",
  (
    req,
    res,
    next
  ) => {
    try {
      const {
        machineId,
        status,
        progress,
        message,
        version,
      } =
        req.body ?? {};

      //================================================
      // MACHINE
      //================================================

      const numericMachineId =
        normalizeMachineId(
          machineId
        );

      if (
        !numericMachineId
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "machineId invalide",
          });
      }

      //================================================
      // PROGRESSION
      //================================================

      const numericProgress =
        Number(
          progress
        );

      const safeProgress =
        Number.isFinite(
          numericProgress
        )
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  numericProgress
                )
              )
            )
          : 0;

      //================================================
      // STATUS
      //================================================

      const safeStatus =
        typeof status ===
          "string" &&
        status.trim()
          ? status.trim()
          : "unknown";

      //================================================
      // MESSAGE
      //================================================

      const safeMessage =
        typeof message ===
        "string"
          ? message.trim()
          : "";

      //================================================
      // VERSION
      //================================================

      const safeVersion =
        typeof version ===
        "string"
          ? version.trim()
          : "";

      //================================================
      // OBJET OTA
      //================================================

      const otaProgress = {
        machineId:
          numericMachineId,

        status:
          safeStatus,

        progress:
          safeProgress,

        message:
          safeMessage,

        version:
          safeVersion,

        timestamp:
          new Date()
            .toISOString(),
      };

      //================================================
      // SOCKET.IO
      //================================================

      const io =
        req.app.get(
          "io"
        );

      if (!io) {
        throw new Error(
          "Socket.IO n'est pas disponible dans l'application"
        );
      }

      /*
       * IMPORTANT :
       *
       * On n'utilise PAS :
       *
       * io.emit(...)
       *
       * La progression est envoyée
       * uniquement dans la room
       * correspondant à la machine.
       */

      io
        .to(
          `machine:${numericMachineId}`
        )
        .emit(
          "firmware:progress",
          otaProgress
        );

      //================================================
      // LOG
      //================================================

      console.log(
        `[OTA] Machine ${numericMachineId} : ` +
          `${safeStatus} - ` +
          `${safeProgress}% - ` +
          `${safeMessage}`
      );

      //================================================
      // RÉPONSE
      //================================================

      return res
        .status(200)
        .json({
          success: true,
          data:
            otaProgress,
        });
    } catch (error) {
      return next(
        error
      );
    }
  }
);

//======================================================
// TÉLÉCHARGEMENT DU FIRMWARE
//======================================================

/*
 * GET /api/firmware/download
 *
 * Cette route est utilisée directement
 * par l'ESP32.
 *
 * Elle reste donc accessible sans
 * JWT utilisateur.
 */

router.get(
  "/download",
  (
    req,
    res,
    next
  ) => {
    try {
      //================================================
      // VÉRIFICATION DU FICHIER
      //================================================

      if (
        !fs.existsSync(
          firmwareFilePath
        )
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fichier firmware introuvable",
          });
      }

      //================================================
      // HEADERS
      //================================================

      res.setHeader(
        "Content-Type",
        "application/octet-stream"
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="diagnostic-machine.bin"'
      );

      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );

      //================================================
      // ENVOI
      //================================================

      return res.sendFile(
        firmwareFilePath,
        (
          error
        ) => {
          if (
            error &&
            !res.headersSent
          ) {
            next(
              error
            );
          }
        }
      );
    } catch (error) {
      return next(
        error
      );
    }
  }
);

//======================================================

export default router;
