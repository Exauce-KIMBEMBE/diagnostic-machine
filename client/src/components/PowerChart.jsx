import { useMemo } from "react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS = [
  {
    value: "1h",
    label: "1 h",
  },
  {
    value: "24h",
    label: "24 h",
  },
  {
    value: "7d",
    label: "7 jours",
  },
  {
    value: "30d",
    label: "30 jours",
  },
];

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getTimestamp(item) {
  return (
    item?.created_at ??
    item?.createdAt ??
    item?.timestamp ??
    null
  );
}

function getLinePower(item, lineName) {
  const lowerLineName =
    lineName.toLowerCase();

  return toNumber(
    item?.[`${lowerLineName}_power`] ??
      item?.lines?.[lineName]?.power ??
      item?.[lineName]?.power
  );
}

function formatAxisTime(
  timestamp,
  period
) {
  if (!timestamp) {
    return "--";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  if (
    period === "7d" ||
    period === "30d"
  ) {
    return date.toLocaleString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  return date.toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatFullDate(timestamp) {
  if (!timestamp) {
    return "Date inconnue";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return date.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

function formatPower(value) {
  const power = toNumber(value);

  if (Math.abs(power) >= 1000) {
    return `${(
      power / 1000
    ).toFixed(2)} kW`;
  }

  return `${power.toFixed(1)} W`;
}

function PowerTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !Array.isArray(payload) ||
    payload.length === 0
  ) {
    return null;
  }

  const timestamp =
    payload[0]?.payload?.timestamp;

  return (
    <div className="power-chart-tooltip">
      <strong>
        {formatFullDate(timestamp)}
      </strong>

      <div className="power-tooltip-values">
        {payload.map((entry) => (
          <div
            className="power-tooltip-row"
            key={entry.dataKey}
          >
            <span>
              {entry.name}
            </span>

            <strong>
              {formatPower(entry.value)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PowerChart({
  history = [],
  period = "24h",
  onPeriodChange,
}) {
  const chartData = useMemo(() => {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .map((item, index) => {
        const timestamp =
          getTimestamp(item);

        const L1 =
          getLinePower(item, "L1");

        const L2 =
          getLinePower(item, "L2");

        const L3 =
          getLinePower(item, "L3");

        return {
          id:
            item?.id ??
            `${timestamp}-${index}`,

          timestamp,

          time: formatAxisTime(
            timestamp,
            period
          ),

          L1,
          L2,
          L3,

          total: L1 + L2 + L3,
        };
      })
      .filter(
        (item) =>
          item.timestamp ||
          item.L1 !== 0 ||
          item.L2 !== 0 ||
          item.L3 !== 0
      )
      .sort((first, second) => {
        const firstTime = new Date(
          first.timestamp
        ).getTime();

        const secondTime = new Date(
          second.timestamp
        ).getTime();

        if (
          Number.isNaN(firstTime) ||
          Number.isNaN(secondTime)
        ) {
          return 0;
        }

        return firstTime - secondTime;
      });
  }, [history, period]);

  const maximumPower = useMemo(() => {
    if (chartData.length === 0) {
      return 0;
    }

    return Math.max(
      ...chartData.flatMap(
        (item) => [
          item.L1,
          item.L2,
          item.L3,
          item.total,
        ]
      )
    );
  }, [chartData]);

  const axisUnit =
    maximumPower >= 1000
      ? "kW"
      : "W";

  const axisFormatter = (value) => {
    const numericValue =
      toNumber(value);

    if (axisUnit === "kW") {
      return (
        numericValue / 1000
      ).toFixed(1);
    }

    return numericValue.toFixed(0);
  };

  return (
    <section className="power-chart-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">
            Tendance électrique
          </span>

          <h2>
            Puissance active des lignes
          </h2>

          <p className="power-chart-description">
            La puissance affichée tient
            compte du facteur de puissance
            transmis ou calculé pour chaque
            ligne.
          </p>
        </div>

        <div className="period-buttons">
          {PERIODS.map(
            ({ value, label }) => (
              <button
                className={
                  period === value
                    ? "period-button active"
                    : "period-button"
                }
                key={value}
                type="button"
                onClick={() =>
                  onPeriodChange?.(value)
                }
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="chart-empty-state">
          Aucune donnée disponible pour
          cette période.
        </div>
      ) : (
        <div className="power-chart-container">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={chartData}
              margin={{
                top: 15,
                right: 20,
                left: 10,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                minTickGap={35}
                tickMargin={10}
              />

              <YAxis
                width={75}
                tickFormatter={
                  axisFormatter
                }
                label={{
                  value: axisUnit,
                  angle: -90,
                  position: "insideLeft",
                }}
              />

              <Tooltip
                content={
                  <PowerTooltip />
                }
              />

              <Legend
                verticalAlign="top"
                height={36}
              />

              <Line
                type="monotone"
                dataKey="L1"
                name="Ligne 1"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                }}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="L2"
                name="Ligne 2"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                }}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="L3"
                name="Ligne 3"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                }}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="total"
                name="Puissance totale"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{
                  r: 5,
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
