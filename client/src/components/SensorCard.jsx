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

export default function SensorCard({
  title,
  value,
  unit,
  status = "offline",
  icon: Icon,
  digits = 1,
}) {
  return (
    <article
      className={`sensor-card sensor-card-${status}`}
    >
      <div className="sensor-card-icon">
        {Icon ? <Icon size={28} /> : null}
      </div>

      <div className="sensor-card-content">
        <span className="sensor-card-title">
          {title}
        </span>

        <strong className="sensor-card-value">
          {formatValue(value, digits)} {unit}
        </strong>
      </div>

      <span
        className={`status-badge status-${status}`}
      >
        {statusLabels[status] || status}
      </span>
    </article>
  );
}