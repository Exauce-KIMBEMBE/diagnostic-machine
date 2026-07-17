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

export default function LineCard({
  title,
  data,
}) {
  const status = data?.status || "offline";

  const metrics = [
    {
      label: "Tension",
      value: formatValue(data?.voltage, 1),
      unit: "V",
      icon: Zap,
    },
    {
      label: "Courant",
      value: formatValue(data?.current, 3),
      unit: "A",
      icon: Activity,
    },
    {
      label: "Puissance",
      value: formatValue(data?.power, 1),
      unit: "W",
      icon: Gauge,
    },
    {
      label: "Énergie",
      value: formatValue(data?.energy, 3),
      unit: "kWh",
      icon: BatteryCharging,
    },
    {
      label: "Fréquence",
      value: formatValue(data?.frequency, 1),
      unit: "Hz",
      icon: Radio,
    },
    {
      label: "Facteur de puissance",
      value: formatValue(data?.powerFactor, 2),
      unit: "",
      icon: Waves,
    },
  ];

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

                <strong className="metric-value">
                  {metric.value} {metric.unit}
                </strong>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}