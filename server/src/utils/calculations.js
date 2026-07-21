export function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

export function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

export function calculateTankData({
  distanceCm,
  reservoirHeightCm,
  reservoirCapacityLiters,
  ultrasonicOffsetCm = 0,
}) {
  const safeDistance = toNumber(distanceCm);
  const safeHeight = toNumber(reservoirHeightCm);
  const safeCapacity = toNumber(
    reservoirCapacityLiters
  );
  const safeOffset = toNumber(
    ultrasonicOffsetCm
  );

  if (safeHeight <= 0) {
    return {
      distanceCm: safeDistance,
      correctedDistanceCm: 0,
      levelCm: 0,
      levelPercent: 0,
      volumeLiters: 0,
    };
  }

  const correctedDistanceCm = Math.max(
    0,
    safeDistance - safeOffset
  );

  const levelCm = clamp(
    safeHeight - correctedDistanceCm,
    0,
    safeHeight
  );

  const levelPercent = clamp(
    (levelCm / safeHeight) * 100,
    0,
    100
  );

  const volumeLiters =
    safeCapacity > 0
      ? (levelPercent / 100) * safeCapacity
      : 0;

  return {
    distanceCm: safeDistance,
    correctedDistanceCm:
      Number(correctedDistanceCm.toFixed(2)),
    levelCm: Number(levelCm.toFixed(2)),
    levelPercent:
      Number(levelPercent.toFixed(2)),
    volumeLiters:
      Number(volumeLiters.toFixed(2)),
  };
}

export function calculateElectricalPower({
  voltage,
  current,
  powerFactor = 1,
}) {
  const safeVoltage = toNumber(voltage);
  const safeCurrent = toNumber(current);
  const safePowerFactor = clamp(
    toNumber(powerFactor, 1),
    0,
    1
  );

  return Number(
    (
      safeVoltage *
      safeCurrent *
      safePowerFactor
    ).toFixed(2)
  );
}
