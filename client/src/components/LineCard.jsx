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

function formatValue(value, digits = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return number.toFixed(digits);
}

function formatPower(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return {
      value: "--",
      unit: "W",
    };
  }

  if (Math.abs(number) >= 1000) {
    return {
      value: (number / 1000).toFixed(2),
      unit: "kW",
    };
  }

  return {
    value: number.toFixed(1),
    unit: "W",
  };
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("fr-FR");
}

export default function LineCard({
  title,
  data,
}) {
  const status = data?.status || "offline";

  const voltage =
    Number(data?.voltage) || 0;

  const current =
    Number(data?.current) || 0;

  const activePower =
    Number(data?.power) || 0;

  const apparentPower =
    voltage * current;

  const reactivePower = Math.sqrt(
    Math.max(
      0,
      apparentPower ** 2 -
        activePower ** 2
    )
  );

  const formattedPower =
    formatPower(data?.power);

  const metrics = [
    {
      label: "Tension",
      value: formatValue(
        data?.voltage,
        1
      ),
      unit: "V",
      icon: Zap,
    },
    {
      label: "Courant",
      value: formatValue(
        data?.current,
        3
      ),
      unit: "A",
      icon: Activity,
    },
    {
      label: "Puissance active",
      value: formattedPower.value,
      unit: formattedPower.unit,
      icon: Gauge,
    },
    {
      label: "Puissance apparente",
      value: formatValue(
        apparentPower,
        1
      ),
      unit: "VA",
      icon: Gauge,
    },
    {
      label: "Puissance réactive",
      value: formatValue(
        reactivePower,
        1
      ),
      unit: "VAR",
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
        data?.powerFactor,
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
    data?.created_at;

  return (
    <article
      className={`line-card line-card-${status}`}
    >
      <div className="line-card-header">
        <div>
          <span className="line-card-eyebrow">
            Mesure électrique
          </span>

          <h2>{title}</h2>
        </div>

        <span
          className={`status-badge status-${status}`}
        >
          {statusLabels[status] || status}
        </span>
      </div>

      <div className="line-card-metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              className="line-card-metric"
              key={metric.label}
            >
              <div className="metric-icon">
                <Icon size={20} />
              </div>

              <div>
                <span className="metric-label">
                  {metric.label}
                </span>

                <strong
                  className={`metric-value metric-${status}`}
                >
                  {metric.value}{" "}
                  {metric.unit}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      <p className="line-update">
        Dernière mesure :{" "}
        <strong>
          {formatDate(updatedAt)}
        </strong>
      </p>
    </article>
  );
}
