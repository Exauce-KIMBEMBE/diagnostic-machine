export const machineState = {
  machineId: 1,

  timestamp: null,

  lines: {
    L1: {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
      status: "offline",
    },

    L2: {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
      status: "offline",
    },

    L3: {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
      status: "offline",
    },
  },

  temperature: {
    value: 0,
    status: "offline",
  },

  flow: {
    value: 0,
    status: "offline",
  },

  /*
   * Réservoir
   */
  tank: {
    distanceCm: 0,
    levelCm: 0,
    levelPercent: 0,
    volumeLiters: 0,
    status: "offline",
  },

  alerts: [],
};
