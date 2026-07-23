import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = Router();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const versionFilePath = path.resolve(
  currentDirectory,
  "../../firmware/version.json"
);

const firmwareFilePath = path.resolve(
  currentDirectory,
  "../../firmware/diagnostic-machine.bin"
);

/*
 * GET /api/firmware
 *
 * Renvoie la version disponible
 * et l'adresse de téléchargement.
 */
router.get("/", (req, res, next) => {
  try {
    if (!fs.existsSync(versionFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Fichier version.json introuvable",
      });
    }

    const versionFileContent = fs.readFileSync(
      versionFilePath,
      "utf8"
    );

    const versionData = JSON.parse(
      versionFileContent
    );

    if (!versionData.version) {
      throw new Error(
        "La version du firmware est absente dans version.json"
      );
    }

    if (!fs.existsSync(firmwareFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Fichier firmware introuvable",
      });
    }

    const firmwareUrl =
      `${req.protocol}://${req.get("host")}` +
      "/api/firmware/download";

    return res.json({
      success: true,
      version: versionData.version,
      url: firmwareUrl,
    });
  } catch (error) {
    next(error);
  }
});

/*
 * POST /api/firmware/progress
 *
 * Reçoit la progression OTA envoyée par l'ESP32,
 * puis la transmet à la page web avec Socket.IO.
 */
router.post("/progress", (req, res, next) => {
  try {
    const {
      machineId,
      status,
      progress,
      message,
      version,
    } = req.body ?? {};

    if (
      machineId === undefined ||
      machineId === null ||
      machineId === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "machineId manquant",
      });
    }

    const numericMachineId = Number(machineId);
    const numericProgress = Number(progress);

    if (!Number.isFinite(numericMachineId)) {
      return res.status(400).json({
        success: false,
        message: "machineId invalide",
      });
    }

    const otaProgress = {
      machineId: numericMachineId,

      status:
        typeof status === "string" && status.trim()
          ? status.trim()
          : "unknown",

      progress: Number.isFinite(numericProgress)
        ? Math.min(
            100,
            Math.max(0, Math.round(numericProgress))
          )
        : 0,

      message:
        typeof message === "string"
          ? message
          : "",

      version:
        typeof version === "string"
          ? version
          : "",

      timestamp: new Date().toISOString(),
    };

    const io = req.app.get("io");

    if (!io) {
      throw new Error(
        "Socket.IO n'est pas disponible dans l'application"
      );
    }

    /*
     * Diffusion générale.
     *
     * La page React filtrera ensuite les événements
     * selon machineId.
     */
   io.to(
      `machine:${numericMachineId}`
    ).emit(
      "firmware:progress",
      otaProgress
    );

    console.log(
      `[OTA] Machine ${otaProgress.machineId} : ` +
      `${otaProgress.status} - ` +
      `${otaProgress.progress}% - ` +
      `${otaProgress.message}`
    );

    return res.status(200).json({
      success: true,
      data: otaProgress,
    });
  } catch (error) {
    next(error);
  }
});

/*
 * GET /api/firmware/download
 *
 * Télécharge directement le fichier .bin.
 */
router.get("/download", (req, res, next) => {
  try {
    if (!fs.existsSync(firmwareFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Fichier firmware introuvable",
      });
    }

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

    res.sendFile(
      firmwareFilePath,
      (error) => {
        if (
          error &&
          !res.headersSent
        ) {
          next(error);
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

export default router;
