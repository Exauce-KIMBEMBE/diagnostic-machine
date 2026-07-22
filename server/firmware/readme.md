# Firmware OTA

Ce dossier contient le firmware utilisé pour les mises à jour OTA de l'ESP32.

## Nom du fichier

Le firmware doit toujours s'appeler :

```
diagnostic-machine.bin
```

## Mise à jour

1. Ouvrir le projet ESP32 dans Arduino IDE.
2. Modifier `FIRMWARE_VERSION` dans `config.h`.
3. Compiler le projet.
4. Exporter le binaire (`Croquis > Exporter les binaires compilés`).
5. Renommer le fichier généré en :

```
diagnostic-machine.bin
```

6. Remplacer le fichier présent dans ce dossier.
7. Modifier la version dans :

```
src/routes/firmwareRoutes.js
```

Exemple :

```js
const firmwareVersion = "1.0.1";
```

8. Faire un commit et un push sur GitHub.
9. Attendre le redéploiement de Render.
10. L'ESP32 téléchargera automatiquement la nouvelle version si elle est plus récente.

---

Ne jamais modifier le nom du fichier `diagnostic-machine.bin`.
