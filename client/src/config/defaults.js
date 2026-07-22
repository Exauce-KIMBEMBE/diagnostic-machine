export const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL;

export const DEFAULT_MACHINE_ID = 1;

export const DEFAULT_REFRESH_INTERVAL = 3000;

const DEFAULT_LINE_THRESHOLDS = {
  voltage: {
    minimum: 210,
    maximum: 240,
    unit: "V",
  },

  current: {
    minimum: 0,
    maximum: 10,
    unit: "A",
  },

  power: {
    minimum: 0,
    maximum: 2200,
    unit: "W",
  },

  apparentPower: {
    minimum: 0,
    maximum: 2500,
    unit: "VA",
  },

  reactivePower: {
    minimum: 0,
    maximum: 1500,
    unit: "VAR",
  },

  energy: {
    minimum: 0,
    maximum: 999999,
    unit: "kWh",
  },

  frequency: {
    minimum: 49,
    maximum: 51,
    unit: "Hz",
  },

  powerFactor: {
    minimum: 0.8,
    maximum: 1,
    unit: "",
  },
};

export const DEFAULT_THRESHOLDS = {
  lines: {
    L1: { ...DEFAULT_LINE_THRESHOLDS },
    L2: { ...DEFAULT_LINE_THRESHOLDS },
    L3: { ...DEFAULT_LINE_THRESHOLDS },
  },

  temperature: {
    minimum: -20,
    maximum: 125,
    warning: 60,
    critical: 80,
    unit: "°C",
  },

  flow: {
    minimum: 5,
    maximum: 60,
    unit: "L/min",
  },

  tank: {
    levelPercent: {
      minimum: 0,
      maximum: 100,
      warning: 20,
      critical: 10,
      unit: "%",
    },

    levelCm: {
      minimum: 0,
      maximum: 100,
      unit: "cm",
    },

    distanceCm: {
      minimum: 0,
      maximum: 600,
      unit: "cm",
    },

    volumeLiters: {
      minimum: 0,
      maximum: 1000,
      unit: "L",
    },
  },
};

export const DEFAULT_MACHINE_CONFIGURATION = {
  ultrasonicOffsetCm: 0,
  reservoirHeightCm: 100,
  reservoirCapacityLiters: 1000,
  temperatureOffsetC: 0,
};
