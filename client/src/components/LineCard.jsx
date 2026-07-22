import {
  Activity,
  BatteryCharging,
  Gauge,
  Radio,
  Waves,
  Zap,
} from "lucide-react";

const statusLabels = {
  normal: "Normal",
  warning: "Attention",
  critical: "Critique",
  offline: "Hors ligne",
};

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function formatValue(
  value,
  digits = 1
) {
  const number = toNumber(value);

  if (number === null) {
    return "--";
  }

  return number.toFixed(digits);
}

function formatPower(value) {
  const number = toNumber(value);

  if (number === null) {
    return {
      value: "--",
      unit: "W",
    };
  }

  if (
    Math.abs(number) >=
    1000
  ) {
    return {
      value: (
        number / 1000
      ).toFixed(2),
      unit: "kW",
    };
  }

  return {
    value: number.toFixed(1),
    unit: "W",
  };
}

function formatApparentPower(
  value
) {
  const number = toNumber(value);

  if (number === null) {
    return {
      value: "--",
      unit: "VA",
    };
  }

  if (
    Math.abs(number) >=
    1000
  ) {
    return {
      value: (
        number / 1000
      ).toFixed(2),
      unit: "kVA",
    };
  }

  return {
    value: number.toFixed(1),
    unit: "VA",
  };
}

function formatReactivePower(
  value
) {
  const number = toNumber(value);

  if (number === null) {
    return {
      value: "--",
      unit: "VAR",
    };
  }

  if (
    Math.abs(number) >=
    1000
  ) {
    return {
      value: (
        number / 1000
      ).toFixed(2),
      unit: "kVAR",
    };
  }

  return {
    value: number.toFixed(1),
    unit: "VAR",
  };
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }

  return date.toLocaleString(
    "fr-FR"
  );
}

export default function LineCard({
  title,
  data,
  lineId,
}) {
  const status =
    data?.status ??
    "offline";

  const voltage =
    toNumber(data?.voltage);

  const current =
    toNumber(data?.current);

  const activePower =
    toNumber(data?.power);

  const transmittedPowerFactor =
    toNumber(
      data?.powerFactor ??
        data?.power_factor
    );

  const apparentPower =
    voltage !== null &&
    current !== null
      ? voltage * current
      : null;

  const calculatedPowerFactor =
    apparentPower !== null &&
    apparentPower > 0 &&
    activePower !== null
      ? activePower /
        apparentPower
      : null;

  const powerFactor =
    transmittedPowerFactor ??
    calculatedPowerFactor;

  const reactivePower =
    apparentPower !== null &&
    activePower !== null
      ? Math.sqrt(
          Math.max(
            0,
            apparentPower ** 2 -
              activePower ** 2
          )
        )
      : null;

  const formattedActivePower =
    formatPower(
      activePower
    );

  const formattedApparentPower =
    formatApparentPower(
      apparentPower
    );

  const formattedReactivePower =
    formatReactivePower(
      reactivePower
    );

  const metrics = [
    {
      label: "Tension",
      value: formatValue(
        voltage,
        1
      ),
      unit: "V",
      icon: Zap,
    },
    {
      label: "Courant",
      value: formatValue(
        current,
        3
      ),
      unit: "A",
      icon: Activity,
    },
    {
      label:
        "Puissance active",
      value:
        formattedActivePower.value,
      unit:
        formattedActivePower.unit,
      icon: Gauge,
    },
    {
      label:
        "Puissance apparente",
      value:
        formattedApparentPower.value,
      unit:
        formattedApparentPower.unit,
      icon: Gauge,
    },
    {
      label:
        "Puissance réactive",
      value:
        formattedReactivePower.value,
      unit:
        formattedReactivePower.unit,
      icon: Gauge,
    },
    {
      label: "Énergie",
      value: formatValue(
        data?.energy,
        3
      ),
      unit: "kWh",
      icon: BatteryCharging,
    },
    {
      label: "Fréquence",
      value: formatValue(
        data?.frequency,
        1
      ),
      unit: "Hz",
      icon: Radio,
    },
    {
      label: "cos φ",
      value: formatValue(
        powerFactor,
        2
      ),
      unit: "",
      icon: Waves,
    },
  ];

  const updatedAt =
    data?.updatedAt ??
    data?.updated_at ??
    data?.timestamp ??
    data?.createdAt ??
    data?.created_at;

  return (
    <article
      className={`line-card line-card-${status}`}
      data-line={lineId}
    >
      <div className="line-card-header">
        <div>
          <span className="line-card-eyebrow">
            Mesure électrique
          </span>

          <h2>
            {title}
          </h2>
        </div>

        <span
          className={`status-badge status-${status}`}
        >
          {statusLabels[
            status
          ] ?? status}
        </span>
      </div>

      <div className="line-card-metrics">
        {metrics.map(
          (metric) => {
            const Icon =
              metric.icon;

            return (
              <div
                className="line-card-metric"
                key={metric.label}
              >
                <div className="metric-icon">
                  <Icon
                    size={20}
                  />
                </div>

                <div className="metric-content">
                  <span className="metric-label">
                    {
                      metric.label
                    }
                  </span>

                  <strong
                    className={`metric-value metric-${status}`}
                  >
                    {
                      metric.value
                    }

                    {metric.unit
                      ? ` ${metric.unit}`
                      : ""}
                  </strong>
                </div>
              </div>
            );
          }
        )}
      </div>

      <p className="line-update">
        Dernière mesure :{" "}
        <strong>
          {formatDate(
            updatedAt
          )}
        </strong>
      </p>
    </article>
  );
}
