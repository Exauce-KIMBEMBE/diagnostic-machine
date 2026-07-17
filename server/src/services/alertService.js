import { thresholds } from "../config/thresholds.js";

function createAlert(source, level, message, value, limit) {
  return {
    id: `${source}-${message}-${Date.now()}`,
    source,
    level,
    message,
    value,
    limit,
    timestamp: new Date().toISOString(),
  };
}

export function checkLineAlerts(lineName, lineData) {
  const lineThresholds = thresholds.lines[lineName];
  const alerts = [];

  if (!lineThresholds) {
    return {
      status: "offline",
      alerts,
    };
  }

  if (lineData.voltage < lineThresholds.voltage.min) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Tension trop basse",
        lineData.voltage,
        lineThresholds.voltage.min
      )
    );
  }

  if (lineData.voltage > lineThresholds.voltage.max) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Tension trop élevée",
        lineData.voltage,
        lineThresholds.voltage.max
      )
    );
  }

  if (lineData.current > lineThresholds.current.max) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Courant trop élevé",
        lineData.current,
        lineThresholds.current.max
      )
    );
  }

  if (lineData.power > lineThresholds.power.max) {
    alerts.push(
      createAlert(
        lineName,
        "critical",
        "Puissance trop élevée",
        lineData.power,
        lineThresholds.power.max
      )
    );
  }

  if (
    lineData.frequency < lineThresholds.frequency.min ||
    lineData.frequency > lineThresholds.frequency.max
  ) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Fréquence hors plage",
        lineData.frequency,
        `${lineThresholds.frequency.min} à ${lineThresholds.frequency.max}`
      )
    );
  }

  if (lineData.powerFactor < lineThresholds.powerFactor.min) {
    alerts.push(
      createAlert(
        lineName,
        "warning",
        "Facteur de puissance trop faible",
        lineData.powerFactor,
        lineThresholds.powerFactor.min
      )
    );
  }

  let status = "normal";

  if (alerts.some((alert) => alert.level === "critical")) {
    status = "critical";
  } else if (alerts.length > 0) {
    status = "warning";
  }

  return {
    status,
    alerts,
  };
}

export function checkTemperatureAlerts(temperature) {
  const alerts = [];
  let status = "normal";

  if (temperature >= thresholds.temperature.critical) {
    status = "critical";

    alerts.push(
      createAlert(
        "Température",
        "critical",
        "Température critique",
        temperature,
        thresholds.temperature.critical
      )
    );
  } else if (temperature >= thresholds.temperature.warning) {
    status = "warning";

    alerts.push(
      createAlert(
        "Température",
        "warning",
        "Température élevée",
        temperature,
        thresholds.temperature.warning
      )
    );
  }

  return {
    status,
    alerts,
  };
}

export function checkFlowAlerts(flow) {
  const alerts = [];
  let status = "normal";

  if (flow < thresholds.flow.min) {
    status = "critical";

    alerts.push(
      createAlert(
        "Débit",
        "critical",
        "Débit trop faible",
        flow,
        thresholds.flow.min
      )
    );
  }

  if (flow > thresholds.flow.max) {
    status = "warning";

    alerts.push(
      createAlert(
        "Débit",
        "warning",
        "Débit trop élevé",
        flow,
        thresholds.flow.max
      )
    );
  }

  return {
    status,
    alerts,
  };
}