import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

/*
 * Version disponible sur le serveur.
 * À modifier à chaque nouvelle mise à jour.
 */
const firmwareVersion = "1.0.0";

/*
 * GET /api/firmware
 *
 * Renvoie la version disponible
 * et l'adresse de téléchargement.
 */
router.get("/", (req, res) => {
  const firmwareUrl =
    `${req.protocol}://${req.get("host")}` +
    "/api/firmware/download";

  res.json({
    success: true,
    version: firmwareVersion,
    url: firmwareUrl,
  });
});

/*
 * GET /api/firmware/download
 *
 * Télécharge directement le fichier .bin.
 */
router.get("/download", (req, res, next) => {
  try {
    const firmwarePath = path.resolve(
      currentDirectory,
      "../../firmware/diagnostic-machine.bin"
    );

    res.setHeader(
      "Content-Type",
      "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="diagnostic-machine.bin"'
    );

    res.sendFile(firmwarePath, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
