export const thresholds = {
  lines: {
    L1: {
      voltage: {
        min: 210,
        max: 240,
      },
      current: {
        max: 10,
      },
      power: {
        max: 2200,
      },
      frequency: {
        min: 49,
        max: 51,
      },
      powerFactor: {
        min: 0.8,
      },
    },

    L2: {
      voltage: {
        min: 210,
        max: 240,
      },
      current: {
        max: 10,
      },
      power: {
        max: 2200,
      },
      frequency: {
        min: 49,
        max: 51,
      },
      powerFactor: {
        min: 0.8,
      },
    },

    L3: {
      voltage: {
        min: 210,
        max: 240,
      },
      current: {
        max: 10,
      },
      power: {
        max: 2200,
      },
      frequency: {
        min: 49,
        max: 51,
      },
      powerFactor: {
        min: 0.8,
      },
    },
  },

  temperature: {
    warning: 60,
    critical: 80,
  },

  flow: {
    min: 5,
    max: 60,
  },
};