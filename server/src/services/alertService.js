import { thresholds } from "../config/thresholds.js";

function createAlert(
  source,
  level,
  message,
  value,
  limit
) {
  return {
    id: `${source}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    source,
    level,
    message,
    value,
    limit,
    timestamp: new Date().toISOString(),
  };
}

function getStatusFromAlerts(alerts = []) {
  if (
    alerts.some(
      (alert) => alert.level === "critical"
    )
  ) {
    return "critical";
  }

  if (alerts.length > 0) {
    return "warning";
  }

  return "normal";
}

/*
 * ===============================
 * ALERTES DES LIGNES ÉLECTRIQUES
 * ===============================
 */

export function checkLineAlerts(
  lineName,
  lineData
) {
  const lineThresholds =
    thresholds.lines?.[lineName];

  const alerts = [];

  if (!lineThresholds || !lineData) {
    return {
      status: "offline",
      alerts,
    };
  }

  const voltage = Number(lineData.voltage);
  const current = Number(lineData.current);
  const power = Number(lineData.power);
  const frequency = Number(lineData.frequency);
  const powerFactor = Number(
    lineData.powerFactor
  );

  if (
    !Number.isFinite(voltage) ||
    !Number.isFinite(current) ||
    !Number.isFinite(power) ||
    !Number.isFinite(frequency) ||
    !Number.isFinite(powerFactor)
  ) {
    return {
      status: "offline",
      alerts,
    };
  }

  /*
   * Tension
   */

  if (
    lineThresholds.voltage?.min !==
      undefined &&
    voltage < lineThresholds.voltage.min
  ) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Tension trop basse",
        voltage,
        lineThresholds.voltage.min
      )
    );
  }

  if (
    lineThresholds.voltage?.max !==
      undefined &&
    voltage > lineThresholds.voltage.max
  ) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Tension trop élevée",
        voltage,
        lineThresholds.voltage.max
      )
    );
  }

  /*
   * Courant
   */

  if (
    lineThresholds.current?.min !==
      undefined &&
    current < lineThresholds.current.min
  ) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Courant trop faible",
        current,
        lineThresholds.current.min
      )
    );
  }

  if (
    lineThresholds.current?.max !==
      undefined &&
    current > lineThresholds.current.max
  ) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Courant trop élevé",
        current,
        lineThresholds.current.max
      )
    );
  }

  /*
   * Puissance
   */

  if (
    lineThresholds.power?.min !==
      undefined &&
    power < lineThresholds.power.min
  ) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Puissance trop faible",
        power,
        lineThresholds.power.min
      )
    );
  }

  if (
    lineThresholds.power?.max !==
      undefined &&
    power > lineThresholds.power.max
  ) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Puissance trop élevée",
        power,
        lineThresholds.power.max
      )
    );
  }

  /*
   * Fréquence
   */

  if (
    lineThresholds.frequency?.min !==
      undefined &&
    frequency <
      lineThresholds.frequency.min
  ) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Fréquence trop basse",
        frequency,
        lineThresholds.frequency.min
      )
    );
  }

  if (
    lineThresholds.frequency?.max !==
      undefined &&
    frequency >
      lineThresholds.frequency.max
  ) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Fréquence trop élevée",
        frequency,
        lineThresholds.frequency.max
      )
    );
  }

  /*
   * Facteur de puissance
   */

  if (
    lineThresholds.powerFactor?.min !==
      undefined &&
    powerFactor <
      lineThresholds.powerFactor.min
  ) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Facteur de puissance trop faible",
        powerFactor,
        lineThresholds.powerFactor.min
      )
    );
  }

  if (
    lineThresholds.powerFactor?.max !==
      undefined &&
    powerFactor >
      lineThresholds.powerFactor.max
  ) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Facteur de puissance trop élevé",
        powerFactor,
        lineThresholds.powerFactor.max
      )
    );
  }

  return {
    status: getStatusFromAlerts(alerts),
    alerts,
  };
}

/*
 * ===============================
 * ALERTES DE TEMPÉRATURE
 * ===============================
 */

export function checkTemperatureAlerts(
  temperature
) {
  const alerts = [];

  const value = Number(temperature);

  if (!Number.isFinite(value)) {
    return {
      status: "offline",
      alerts,
    };
  }

  if (
    thresholds.temperature?.min !==
      undefined &&
    value < thresholds.temperature.min
  ) {
    alerts.push(
      createAlert(
        "Température",
        "critical",
        "Température trop basse",
        value,
        thresholds.temperature.min
      )
    );
  }

  if (
    thresholds.temperature?.critical !==
      undefined &&
    value >= thresholds.temperature.critical
  ) {
    alerts.push(
      createAlert(
        "Température",
        "critical",
        "Température critique",
        value,
        thresholds.temperature.critical
      )
    );
  } else if (
    thresholds.temperature?.warning !==
      undefined &&
    value >= thresholds.temperature.warning
  ) {
    alerts.push(
      createAlert(
        "Température",
        "warning",
        "Température élevée",
        value,
        thresholds.temperature.warning
      )
    );
  }

  if (
    thresholds.temperature?.max !==
      undefined &&
    value > thresholds.temperature.max
  ) {
    alerts.push(
      createAlert(
        "Température",
        "critical",
        "Température supérieure à la limite du capteur",
        value,
        thresholds.temperature.max
      )
    );
  }

  return {
    status: getStatusFromAlerts(alerts),
    alerts,
  };
}

/*
 * ===============================
 * ALERTES DE DÉBIT
 * ===============================
 */

export function checkFlowAlerts(flow) {
  const alerts = [];

  const value = Number(flow);

  if (!Number.isFinite(value)) {
    return {
      status: "offline",
      alerts,
    };
  }

  if (
    thresholds.flow?.min !== undefined &&
    value < thresholds.flow.min
  ) {
    alerts.push(
      createAlert(
        "Débit",
        "critical",
        "Débit trop faible",
        value,
        thresholds.flow.min
      )
    );
  }

  if (
    thresholds.flow?.max !== undefined &&
    value > thresholds.flow.max
  ) {
    alerts.push(
      createAlert(
        "Débit",
        "warning",
        "Débit trop élevé",
        value,
        thresholds.flow.max
      )
    );
  }

  return {
    status: getStatusFromAlerts(alerts),
    alerts,
  };
}

/*
 * ===============================
 * ALERTES DU RÉSERVOIR
 * ===============================
 */

export function checkTankAlerts(tankData = {}) {
  const alerts = [];

  const tankThresholds =
    thresholds.tank?.levelPercent;

  if (!tankThresholds) {
    return {
      status: "offline",
      alerts,
    };
  }

  const levelPercent = Number(
    tankData.levelPercent
  );

  const distanceCm = Number(
    tankData.distanceCm
  );

  const volumeLiters = Number(
    tankData.volumeLiters
  );

  if (!Number.isFinite(levelPercent)) {
    return {
      status: "offline",
      alerts,
    };
  }

  /*
   * Niveau trop bas
   */

  if (
    tankThresholds.criticalLow !==
      undefined &&
    levelPercent <=
      tankThresholds.criticalLow
  ) {
    alerts.push(
      createAlert(
        "Réservoir",
        "critical",
        "Niveau du réservoir critique",
        levelPercent,
        tankThresholds.criticalLow
      )
    );
  } else if (
    tankThresholds.warningLow !==
      undefined &&
    levelPercent <=
      tankThresholds.warningLow
  ) {
    alerts.push(
      createAlert(
        "Réservoir",
        "warning",
        "Niveau du réservoir faible",
        levelPercent,
        tankThresholds.warningLow
      )
    );
  }

  /*
   * Niveau trop haut
   */

  if (
    tankThresholds.criticalHigh !==
      undefined &&
    levelPercent >=
      tankThresholds.criticalHigh
  ) {
    alerts.push(
      createAlert(
        "Réservoir",
        "critical",
        "Niveau du réservoir critique élevé",
        levelPercent,
        tankThresholds.criticalHigh
      )
    );
  } else if (
    tankThresholds.warningHigh !==
      undefined &&
    levelPercent >=
      tankThresholds.warningHigh
  ) {
    alerts.push(
      createAlert(
        "Réservoir",
        "warning",
        "Niveau du réservoir élevé",
        levelPercent,
        tankThresholds.warningHigh
      )
    );
  }

  /*
   * Contrôle de la distance ultrasonique
   */

  if (Number.isFinite(distanceCm)) {
    const distanceThresholds =
      thresholds.tank?.distanceCm;

    if (
      distanceThresholds?.min !==
        undefined &&
      distanceCm < distanceThresholds.min
    ) {
      alerts.push(
        createAlert(
          "Capteur ultrason",
          "warning",
          "Distance ultrasonique trop faible",
          distanceCm,
          distanceThresholds.min
        )
      );
    }

    if (
      distanceThresholds?.max !==
        undefined &&
      distanceCm > distanceThresholds.max
    ) {
      alerts.push(
        createAlert(
          "Capteur ultrason",
          "critical",
          "Distance ultrasonique hors plage",
          distanceCm,
          distanceThresholds.max
        )
      );
    }
  }

  /*
   * Contrôle du volume
   */

  if (Number.isFinite(volumeLiters)) {
    const volumeThresholds =
      thresholds.tank?.volumeLiters;

    if (
      volumeThresholds?.min !==
        undefined &&
      volumeLiters < volumeThresholds.min
    ) {
      alerts.push(
        createAlert(
          "Réservoir",
          "warning",
          "Volume inférieur à la limite",
          volumeLiters,
          volumeThresholds.min
        )
      );
    }

    if (
      volumeThresholds?.max !==
        undefined &&
      volumeLiters > volumeThresholds.max
    ) {
      alerts.push(
        createAlert(
          "Réservoir",
          "critical",
          "Volume supérieur à la capacité du réservoir",
          volumeLiters,
          volumeThresholds.max
        )
      );
    }
  }

  return {
    status: getStatusFromAlerts(alerts),
    alerts,
  };
}
