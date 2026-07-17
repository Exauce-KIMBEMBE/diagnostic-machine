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

function formatTime(value) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function PowerChart({
  history = [],
  period = "24h",
  onPeriodChange,
}) {
  const chartData = history.map((item) => ({
    time: formatTime(item.created_at),

    L1: Number(item.l1_power) || 0,
    L2: Number(item.l2_power) || 0,
    L3: Number(item.l3_power) || 0,
  }));

  return (
    <section className="power-chart-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">
            Tendance électrique
          </span>

          <h2>Puissance en temps réel</h2>
        </div>

        <div className="period-buttons">
          {["1h", "24h", "7d", "30d"].map(
            (value) => (
              <button
                className={
                  period === value
                    ? "period-button active"
                    : "period-button"
                }
                key={value}
                type="button"
                onClick={() => {
                  if (onPeriodChange) {
                    onPeriodChange(value);
                  }
                }}
              >
                {value}
              </button>
            )
          )}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="chart-empty-state">
          Aucune donnée disponible pour cette période.
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
                top: 10,
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
              />

              <YAxis
                width={80}
                unit=" W"
              />

              <Tooltip
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)} W`,
                  name,
                ]}
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="L1"
                name="Ligne 1"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="L2"
                name="Ligne 2"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="L3"
                name="Ligne 3"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}