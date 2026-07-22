function toFiniteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export function formatNumber(
  value,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    fallback = "--",
  } = {}
) {
  const number = toFiniteNumber(value);

  if (number === null) {
    return fallback;
  }

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(number);
}

export function formatValue(
  value,
  unit = "",
  options = {}
) {
  const formattedValue = formatNumber(
    value,
    options
  );

  if (formattedValue === "--") {
    return formattedValue;
  }

  return unit
    ? `${formattedValue} ${unit}`
    : formattedValue;
}

export function formatVoltage(value) {
  return formatValue(value, "V", {
    maximumFractionDigits: 1,
  });
}

export function formatCurrent(value) {
  return formatValue(value, "A", {
    maximumFractionDigits: 2,
  });
}

export function formatPower(value) {
  const number = toFiniteNumber(value);

  if (number === null) {
    return "--";
  }

  if (Math.abs(number) >= 1000) {
    return formatValue(
      number / 1000,
      "kW",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  return formatValue(number, "W", {
    maximumFractionDigits: 1,
  });
}

export function formatApparentPower(
  value
) {
  const number = toFiniteNumber(value);

  if (number === null) {
    return "--";
  }

  if (Math.abs(number) >= 1000) {
    return formatValue(
      number / 1000,
      "kVA",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  return formatValue(number, "VA", {
    maximumFractionDigits: 1,
  });
}

export function formatReactivePower(
  value
) {
  const number = toFiniteNumber(value);

  if (number === null) {
    return "--";
  }

  if (Math.abs(number) >= 1000) {
    return formatValue(
      number / 1000,
      "kVAR",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  return formatValue(number, "VAR", {
    maximumFractionDigits: 1,
  });
}

export function formatEnergy(value) {
  return formatValue(value, "kWh", {
    maximumFractionDigits: 3,
  });
}

export function formatFrequency(value) {
  return formatValue(value, "Hz", {
    maximumFractionDigits: 2,
  });
}

export function formatPowerFactor(
  value
) {
  return formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTemperature(
  value
) {
  return formatValue(value, "°C", {
    maximumFractionDigits: 1,
  });
}

export function formatFlow(value) {
  return formatValue(value, "L/min", {
    maximumFractionDigits: 2,
  });
}

export function formatDistance(value) {
  return formatValue(value, "cm", {
    maximumFractionDigits: 1,
  });
}

export function formatVolume(value) {
  return formatValue(value, "L", {
    maximumFractionDigits: 1,
  });
}

export function formatPercentage(
  value
) {
  return formatValue(value, "%", {
    maximumFractionDigits: 1,
  });
}

export function formatCurrency(
  value,
  currency = "EUR"
) {
  const number = toFiniteNumber(value);

  if (number === null) {
    return "--";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  ).format(date);
}

export function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

export function formatTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  ).format(date);
}

export function formatStatus(status) {
  const normalizedStatus = String(
    status ?? ""
  ).toLowerCase();

  const labels = {
    online: "En ligne",
    connected: "En ligne",
    active: "Actif",
    normal: "Normal",
    warning: "Avertissement",
    critical: "Critique",
    offline: "Hors ligne",
    disconnected: "Hors ligne",
    error: "Erreur",
    acknowledged: "Acquittée",
  };

  return (
    labels[normalizedStatus] ||
    status ||
    "--"
  );
}

export function formatSource(source) {
  const normalizedSource = String(
    source ?? ""
  ).toUpperCase();

  const labels = {
    L1: "Ligne 1",
    L2: "Ligne 2",
    L3: "Ligne 3",
    TEMPERATURE: "Température",
    FLOW: "Débit",
    TANK: "Réservoir",
  };

  return (
    labels[normalizedSource] ||
    source ||
    "--"
  );
}

export function formatParameterName(
  parameterName
) {
  const labels = {
    voltage: "Tension",
    current: "Courant",
    power: "Puissance active",
    apparentPower:
      "Puissance apparente",
    apparent_power:
      "Puissance apparente",
    reactivePower:
      "Puissance réactive",
    reactive_power:
      "Puissance réactive",
    energy: "Énergie",
    frequency: "Fréquence",
    powerFactor:
      "Facteur de puissance",
    power_factor:
      "Facteur de puissance",
    temperature: "Température",
    flow: "Débit",
    flow_rate: "Débit",
    distanceCm: "Distance",
    distance_cm: "Distance",
    levelCm: "Niveau",
    level_cm: "Niveau",
    levelPercent:
      "Niveau du réservoir",
    level_percent:
      "Niveau du réservoir",
    volumeLiters: "Volume",
    volume_liters: "Volume",
  };

  return (
    labels[parameterName] ||
    parameterName ||
    "--"
  );
}
