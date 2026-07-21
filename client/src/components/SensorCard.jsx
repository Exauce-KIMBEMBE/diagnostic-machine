function formatValue(value, digits = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return number.toFixed(digits);
}

const statusLabels = {
  normal: "Normal",
  warning: "Attention",
  critical: "Critique",
  offline: "Hors ligne",
};

function getProgress(status) {
  switch (status) {
    case "normal":
      return 35;

    case "warning":
      return 70;

    case "critical":
      return 100;

    default:
      return 0;
  }
}

export default function SensorCard({
  title,
  value,
  unit = "",
  status = "offline",
  icon: Icon,
  digits = 1,
}) {
  return (
    <article
      className={`sensor-card sensor-card-${status}`}
    >
      <div className="sensor-card-header">
        <div className="sensor-card-icon">
          {Icon && <Icon size={28} />}
        </div>

        <span
          className={`status-badge status-${status}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      <div className="sensor-card-content">
        <span className="sensor-card-title">
          {title}
        </span>

        <strong className="sensor-card-value">
          {formatValue(value, digits)}
          <small>{unit}</small>
        </strong>
      </div>

      <div className="sensor-progress">
        <div
          className={`sensor-progress-fill sensor-progress-${status}`}
          style={{
            width: `${getProgress(status)}%`,
          }}
        />
      </div>
    </article>
  );
}
