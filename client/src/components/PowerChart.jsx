import { useMemo } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS = [
  {
    value: "realtime",
    label: "Temps réel",
  },
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

const LINE_LABELS = {
  L1: "Ligne 1",
  L2: "Ligne 2",
  L3: "Ligne 3",
};

const LINE_COLORS = {
  L1: "#3b82f6",
  L2: "#22c55e",
  L3: "#f97316",
};

const METRICS = {
  power: {
    label: "Puissance",
    unit: "W",
    lineMetric: true,
  },

  current: {
    label: "Courant",
    unit: "A",
    lineMetric: true,
  },

  voltage: {
    label: "Tension",
    unit: "V",
    lineMetric: true,
  },

  energy: {
    label: "Énergie",
    unit: "kWh",
    lineMetric: true,
  },

  powerFactor: {
    label: "Facteur de puissance",
    unit: "",
    lineMetric: true,
  },

  frequency: {
    label: "Fréquence",
    unit: "Hz",
    lineMetric: true,
  },

  cost: {
    label: "Coût",
    unit: "€",
    lineMetric: true,
  },

  temperature: {
    label: "Température",
    unit: "°C",
    lineMetric: false,
    color: "#ef4444",
  },

  flow: {
    label: "Débit",
    unit: "L/min",
    lineMetric: false,
    color: "#06b6d4",
  },

  tank: {
    label: "Niveau réservoir",
    unit: "%",
    lineMetric: false,
    color: "#8b5cf6",
  },
};

const FALLBACK_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#06b6d4",
  "#ef4444",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function getTimestamp(item) {
  return (
    item?.created_at ??
    item?.createdAt ??
    item?.timestamp ??
    item?.date ??
    null
  );
}

function getNestedValue(
  object,
  paths
) {
  for (const path of paths) {
    const keys = path.split(".");

    let value = object;

    for (const key of keys) {
      value = value?.[key];

      if (
        value === undefined ||
        value === null
      ) {
        break;
      }
    }

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return null;
}

function getLineMetric(
  item,
  lineId,
  metricId
) {
  const lowerLine =
    lineId.toLowerCase();

  const snakeMetric =
    metricId.replace(
      /[A-Z]/g,
      (letter) =>
        `_${letter.toLowerCase()}`
    );

  const camelMetric =
    metricId;

  return toNumber(
    getNestedValue(
      item,
      [
        `${lowerLine}_${snakeMetric}`,
        `${lowerLine}_${camelMetric}`,
        `${lineId}_${snakeMetric}`,
        `${lineId}_${camelMetric}`,

        `lines.${lineId}.${camelMetric}`,
        `lines.${lineId}.${snakeMetric}`,

        `${lineId}.${camelMetric}`,
        `${lineId}.${snakeMetric}`,
      ]
    )
  );
}

function getGlobalMetric(
  item,
  metricId
) {
  if (metricId === "temperature") {
    return toNumber(
      getNestedValue(
        item,
        [
          "temperature",
          "temperature.value",
          "temperature_value",
          "temperatureValue",
          "sensors.temperature",
          "sensors.temperature.value",
        ]
      )
    );
  }

  if (metricId === "flow") {
    return toNumber(
      getNestedValue(
        item,
        [
          "flow",
          "flow.value",
          "flow_value",
          "flowValue",
          "flowRate",
          "flow_rate",
          "sensors.flow",
          "sensors.flow.value",
        ]
      )
    );
  }

  if (metricId === "tank") {
    return toNumber(
      getNestedValue(
        item,
        [
          "tank",
          "tank.levelPercent",
          "tank.level_percent",
          "tankLevel",
          "tank_level",
          "tankLevelPercent",
          "tank_level_percent",
          "levelPercent",
          "level_percent",
        ]
      )
    );
  }

  return null;
}

function formatAxisTime(
  timestamp,
  period
) {
  if (!timestamp) {
    return "--";
  }

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

function formatFullDate(
  timestamp
) {
  if (!timestamp) {
    return "Date inconnue";
  }

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

function formatMetricValue(
  value,
  metricId
) {
  const number =
    toNumber(value);

  if (number === null) {
    return "--";
  }

  const metric =
    METRICS[metricId];

  if (metricId === "power") {
    if (
      Math.abs(number) >=
      1000
    ) {
      return `${(
        number / 1000
      ).toFixed(2)} kW`;
    }

    return `${number.toFixed(
      1
    )} W`;
  }

  if (
    metricId ===
    "powerFactor"
  ) {
    return number.toFixed(2);
  }

  if (
    metricId === "current" ||
    metricId === "voltage" ||
    metricId ===
      "temperature" ||
    metricId === "flow" ||
    metricId === "tank" ||
    metricId ===
      "frequency"
  ) {
    return `${number.toFixed(
      2
    )} ${metric?.unit ?? ""}`.trim();
  }

  if (
    metricId === "energy"
  ) {
    return `${number.toFixed(
      3
    )} kWh`;
  }

  if (metricId === "cost") {
    return `${number.toFixed(
      2
    )} €`;
  }

  return `${number.toFixed(
    2
  )} ${metric?.unit ?? ""}`.trim();
}

function getSeriesColor(
  series,
  index
) {
  if (
    series.lineId &&
    LINE_COLORS[
      series.lineId
    ]
  ) {
    return LINE_COLORS[
      series.lineId
    ];
  }

  if (
    METRICS[
      series.metricId
    ]?.color
  ) {
    return METRICS[
      series.metricId
    ].color;
  }

  return FALLBACK_COLORS[
    index %
      FALLBACK_COLORS.length
  ];
}

function ChartTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !Array.isArray(payload) ||
    payload.length === 0
  ) {
    return null;
  }

  const timestamp =
    payload[0]?.payload
      ?.timestamp;

  return (
    <div className="power-chart-tooltip">
      <strong>
        {formatFullDate(
          timestamp
        )}
      </strong>

      <div className="power-tooltip-values">
        {payload.map(
          (entry) => {
            const metricId =
              entry?.payload
                ?.__seriesMetrics?.[
                entry.dataKey
              ] ??
              entry?.metricId ??
              "power";

            return (
              <div
                className="power-tooltip-row"
                key={
                  entry.dataKey
                }
              >
                <span>
                  {entry.name}
                </span>

                <strong>
                  {formatMetricValue(
                    entry.value,
                    metricId
                  )}
                </strong>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !Array.isArray(payload) ||
    payload.length === 0
  ) {
    return null;
  }

  const item =
    payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="power-chart-tooltip">
      <strong>
        {item.name}
      </strong>

      <div className="power-tooltip-values">
        <div className="power-tooltip-row">
          <span>
            Valeur
          </span>

          <strong>
            {formatMetricValue(
              item.value,
              item.metricId
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default function PowerChart({
  history = [],
  period = "24h",
  onPeriodChange,
  selectedLines = [
    "L1",
    "L2",
    "L3",
  ],
  selectedMetrics = [
    "power",
  ],
  chartType = "line",
}) {
  const activeSeries =
    useMemo(() => {
      const series = [];

      selectedMetrics.forEach(
        (metricId) => {
          const metric =
            METRICS[metricId];

          if (!metric) {
            return;
          }

          if (
            metric.lineMetric
          ) {
            selectedLines.forEach(
              (lineId) => {
                series.push({
                  dataKey: `${lineId}_${metricId}`,
                  lineId,
                  metricId,
                  name: `${LINE_LABELS[lineId]} - ${metric.label}`,
                });
              }
            );

            return;
          }

          series.push({
            dataKey: metricId,
            lineId: null,
            metricId,
            name: metric.label,
          });
        }
      );

      return series;
    }, [
      selectedLines,
      selectedMetrics,
    ]);

  const chartData =
    useMemo(() => {
      if (
        !Array.isArray(history)
      ) {
        return [];
      }

      return history
        .map(
          (
            item,
            index
          ) => {
            const timestamp =
              getTimestamp(
                item
              );

            const row = {
              id:
                item?.id ??
                `${timestamp}-${index}`,

              timestamp,

              time:
                formatAxisTime(
                  timestamp,
                  period
                ),

              __seriesMetrics:
                {},
            };

            activeSeries.forEach(
              (series) => {
                const value =
                  series.lineId
                    ? getLineMetric(
                        item,
                        series.lineId,
                        series.metricId
                      )
                    : getGlobalMetric(
                        item,
                        series.metricId
                      );

                row[
                  series.dataKey
                ] = value;

                row.__seriesMetrics[
                  series.dataKey
                ] =
                  series.metricId;
              }
            );

            return row;
          }
        )
        .filter((row) =>
          activeSeries.some(
            (series) =>
              row[
                series.dataKey
              ] !== null
          )
        )
        .sort(
          (
            first,
            second
          ) => {
            const firstTime =
              new Date(
                first.timestamp
              ).getTime();

            const secondTime =
              new Date(
                second.timestamp
              ).getTime();

            if (
              Number.isNaN(
                firstTime
              ) ||
              Number.isNaN(
                secondTime
              )
            ) {
              return 0;
            }

            return (
              firstTime -
              secondTime
            );
          }
        );
    }, [
      history,
      period,
      activeSeries,
    ]);

  const visibleSeries =
    useMemo(() => {
      return activeSeries.filter(
        (series) =>
          chartData.some(
            (row) =>
              row[
                series.dataKey
              ] !== null
          )
      );
    }, [
      activeSeries,
      chartData,
    ]);

  const maximumValue =
    useMemo(() => {
      const values =
        chartData.flatMap(
          (row) =>
            visibleSeries
              .map(
                (series) =>
                  toNumber(
                    row[
                      series.dataKey
                    ]
                  )
              )
              .filter(
                (value) =>
                  value !== null
              )
        );

      if (
        values.length === 0
      ) {
        return 0;
      }

      return Math.max(
        ...values.map(
          (value) =>
            Math.abs(value)
        )
      );
    }, [
      chartData,
      visibleSeries,
    ]);

  const selectedMetricUnits =
    useMemo(() => {
      return [
        ...new Set(
          visibleSeries.map(
            (series) =>
              METRICS[
                series.metricId
              ]?.unit ?? ""
          )
        ),
      ].filter(Boolean);
    }, [visibleSeries]);

  const axisUnit =
    selectedMetricUnits.length ===
    1
      ? selectedMetricUnits[0]
      : "";

  const axisFormatter = (
    value
  ) => {
    const number =
      toNumber(value);

    if (number === null) {
      return "0";
    }

    const onlyPower =
      visibleSeries.length > 0 &&
      visibleSeries.every(
        (series) =>
          series.metricId ===
          "power"
      );

    if (
      onlyPower &&
      maximumValue >= 1000
    ) {
      return (
        number / 1000
      ).toFixed(1);
    }

    if (
      Math.abs(number) >=
      1000
    ) {
      return number.toFixed(
        0
      );
    }

    if (
      Math.abs(number) >=
      100
    ) {
      return number.toFixed(
        0
      );
    }

    return number.toFixed(1);
  };

  const displayedAxisUnit =
    visibleSeries.length > 0 &&
    visibleSeries.every(
      (series) =>
        series.metricId ===
        "power"
    ) &&
    maximumValue >= 1000
      ? "kW"
      : axisUnit;

  const pieData =
    useMemo(() => {
      if (
        chartData.length === 0
      ) {
        return [];
      }

      const lastData =
        chartData[
          chartData.length - 1
        ];

      return visibleSeries
        .map(
          (
            series,
            index
          ) => ({
            name: series.name,

            value:
              toNumber(
                lastData[
                  series.dataKey
                ]
              ) ?? 0,

            metricId:
              series.metricId,

            color:
              getSeriesColor(
                series,
                index
              ),
          })
        )
        .filter(
          (item) =>
            item.value !== 0
        );
    }, [
      chartData,
      visibleSeries,
    ]);

  function renderLines() {
    return visibleSeries.map(
      (
        series,
        index
      ) => (
        <Line
          key={
            series.dataKey
          }
          type="monotone"
          dataKey={
            series.dataKey
          }
          name={series.name}
          stroke={getSeriesColor(
            series,
            index
          )}
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 5,
          }}
          connectNulls
          isAnimationActive={
            false
          }
        />
      )
    );
  }

  function renderBars() {
    return visibleSeries.map(
      (
        series,
        index
      ) => (
        <Bar
          key={
            series.dataKey
          }
          dataKey={
            series.dataKey
          }
          name={series.name}
          fill={getSeriesColor(
            series,
            index
          )}
          radius={[
            4,
            4,
            0,
            0,
          ]}
          isAnimationActive={
            false
          }
        />
      )
    );
  }

  function renderAreas() {
    return visibleSeries.map(
      (
        series,
        index
      ) => {
        const color =
          getSeriesColor(
            series,
            index
          );

        return (
          <Area
            key={
              series.dataKey
            }
            type="monotone"
            dataKey={
              series.dataKey
            }
            name={
              series.name
            }
            stroke={color}
            fill={color}
            fillOpacity={0.18}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
            }}
            connectNulls
            isAnimationActive={
              false
            }
          />
        );
      }
    );
  }

  function renderCartesianChart() {
    const commonElements = (
      <>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgba(148, 163, 184, 0.16)"
        />

        <XAxis
          dataKey="time"
          minTickGap={35}
          tickMargin={10}
          stroke="#94a3b8"
          tick={{
            fill: "#94a3b8",
            fontSize: 11,
          }}
        />

        <YAxis
          width={70}
          tickFormatter={
            axisFormatter
          }
          stroke="#94a3b8"
          tick={{
            fill: "#94a3b8",
            fontSize: 11,
          }}
          label={
            displayedAxisUnit
              ? {
                  value:
                    displayedAxisUnit,
                  angle: -90,
                  position:
                    "insideLeft",
                  fill: "#94a3b8",
                }
              : undefined
          }
        />

        <Tooltip
          content={
            <ChartTooltip />
          }
        />

        <Legend
          verticalAlign="top"
          height={42}
          wrapperStyle={{
            fontSize: "12px",
          }}
        />
      </>
    );

    if (
      chartType === "bar"
    ) {
      return (
        <BarChart
          data={chartData}
          margin={{
            top: 15,
            right: 15,
            left: 5,
            bottom: 10,
          }}
        >
          {commonElements}
          {renderBars()}
        </BarChart>
      );
    }

    if (
      chartType === "area"
    ) {
      return (
        <AreaChart
          data={chartData}
          margin={{
            top: 15,
            right: 15,
            left: 5,
            bottom: 10,
          }}
        >
          {commonElements}
          {renderAreas()}
        </AreaChart>
      );
    }

    return (
      <LineChart
        data={chartData}
        margin={{
          top: 15,
          right: 15,
          left: 5,
          bottom: 10,
        }}
      >
        {commonElements}
        {renderLines()}
      </LineChart>
    );
  }

  const hasData =
    chartType === "pie"
      ? pieData.length > 0
      : chartData.length >
          0 &&
        visibleSeries.length >
          0;

  return (
    <section className="power-chart-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">
            Tendance des mesures
          </span>

          <h2>
            Analyse des données
          </h2>

          <p className="power-chart-description">
            Les courbes affichées
            correspondent aux lignes et
            aux paramètres sélectionnés.
          </p>
        </div>

        {onPeriodChange && (
          <div className="period-buttons">
            {PERIODS.map(
              ({
                value,
                label,
              }) => (
                <button
                  className={
                    period ===
                    value
                      ? "period-button active"
                      : "period-button"
                  }
                  key={value}
                  type="button"
                  onClick={() =>
                    onPeriodChange(
                      value
                    )
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="chart-empty-state">
          Aucune donnée disponible pour
          les lignes, les paramètres ou
          la période sélectionnés.
        </div>
      ) : (
        <div className="power-chart-container">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            {chartType ===
            "pie" ? (
              <PieChart>
                <Tooltip
                  content={
                    <PieTooltip />
                  }
                />

                <Legend
                  verticalAlign="bottom"
                  height={48}
                  wrapperStyle={{
                    fontSize:
                      "11px",
                  }}
                />

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius="70%"
                  innerRadius="38%"
                  paddingAngle={2}
                  isAnimationActive={
                    false
                  }
                >
                  {pieData.map(
                    (
                      item,
                      index
                    ) => (
                      <Cell
                        key={`${item.name}-${index}`}
                        fill={
                          item.color
                        }
                      />
                    )
                  )}
                </Pie>
              </PieChart>
            ) : (
              renderCartesianChart()
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
