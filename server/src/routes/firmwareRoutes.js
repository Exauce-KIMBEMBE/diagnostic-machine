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

    const firmwareUrl =
      `${req.protocol}://${req.get("host")}` +
      "/api/firmware/download";

    res.json({
      success: true,
      version: versionData.version,
      url: firmwareUrl,
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

    res.sendFile(firmwareFilePath, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
