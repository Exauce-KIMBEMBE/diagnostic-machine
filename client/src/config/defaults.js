export const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL;

export const DEFAULT_MACHINE_ID = 1;

export const DEFAULT_REFRESH_INTERVAL = 5000;

export const DEFAULT_THRESHOLDS = {
  lines: {
    L1: {
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
    },

    L2: {
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
    },

    L3: {
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
    },
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
