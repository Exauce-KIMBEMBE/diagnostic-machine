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
  const normalizedStatus =
    statusLabels[status]
      ? status
      : "offline";

  const formattedValue =
    formatValue(
      value,
      digits
    );

  return (
    <article
      className={`sensor-card sensor-card-${normalizedStatus}`}
    >
      <div className="sensor-card-header">
        <div className="sensor-card-icon">
          {Icon ? (
            <Icon size={28} />
          ) : null}
        </div>

        <span
          className={`status-badge status-${normalizedStatus}`}
        >
          {
            statusLabels[
              normalizedStatus
            ]
          }
        </span>
      </div>

      <div className="sensor-card-content">
        <span className="sensor-card-title">
          {title}
        </span>

        <strong className="sensor-card-value">
          {formattedValue}

          {unit ? (
            <small>
              {unit}
            </small>
          ) : null}
        </strong>
      </div>

      <div
        className="sensor-progress"
        aria-label={`État du capteur : ${
          statusLabels[
            normalizedStatus
          ]
        }`}
      >
        <div
          className={`sensor-progress-fill sensor-progress-${normalizedStatus}`}
          style={{
            width: `${getProgress(
              normalizedStatus
            )}%`,
          }}
        />
      </div>
    </article>
  );
}
