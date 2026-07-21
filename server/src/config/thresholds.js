export const defaultThresholds = {
  lines: {
    L1: {
      voltage: {
        min: 210,
        max: 240,
        unit: "V",
      },
      current: {
        min: 0,
        max: 10,
        unit: "A",
      },
      power: {
        min: 0,
        max: 2200,
        unit: "W",
      },
      frequency: {
        min: 49,
        max: 51,
        unit: "Hz",
      },
      powerFactor: {
        min: 0.8,
        max: 1,
        unit: "",
      },
    },

    L2: {
      voltage: {
        min: 210,
        max: 240,
        unit: "V",
      },
      current: {
        min: 0,
        max: 10,
        unit: "A",
      },
      power: {
        min: 0,
        max: 2200,
        unit: "W",
      },
      frequency: {
        min: 49,
        max: 51,
        unit: "Hz",
      },
      powerFactor: {
        min: 0.8,
        max: 1,
        unit: "",
      },
    },

    L3: {
      voltage: {
        min: 210,
        max: 240,
        unit: "V",
      },
      current: {
        min: 0,
        max: 10,
        unit: "A",
      },
      power: {
        min: 0,
        max: 2200,
        unit: "W",
      },
      frequency: {
        min: 49,
        max: 51,
        unit: "Hz",
      },
      powerFactor: {
        min: 0.8,
        max: 1,
        unit: "",
      },
    },
  },

  temperature: {
    min: -20,
    warning: 60,
    critical: 80,
    max: 125,
    unit: "°C",
  },

  flow: {
    min: 5,
    max: 60,
    unit: "L/min",
  },

  tank: {
    levelPercent: {
      warningLow: 20,
      criticalLow: 10,
      warningHigh: 90,
      criticalHigh: 98,
      unit: "%",
    },

    volumeLiters: {
      min: 0,
      max: 1000,
      unit: "L",
    },

    distanceCm: {
      min: 20,
      max: 600,
      unit: "cm",
    },
  },
};

/*
 * Compatibilité avec les anciens imports :
 *
 * import { thresholds } from "./config/thresholds.js";
 */
export const thresholds = defaultThresholds;
