function getGlobalStatus({
  machineOnline,
  alerts,
  lines,
  temperature,
  flow,
  tank,
}) {
  if (!machineOnline) {
    return "offline";
  }

  const hasCriticalAlert = alerts.some(
    (alert) =>
      getAlertLevel(alert) ===
      "critical"
  );

  if (hasCriticalAlert) {
    return "critical";
  }

  const statuses = [
    lines?.L1?.status,
    lines?.L2?.status,
    lines?.L3?.status,
    temperature?.status,
    flow?.status,
    tank?.status,
  ];

  if (
    statuses.some(
      (status) =>
        status === "critical"
    )
  ) {
    return "critical";
  }

  const hasWarningAlert = alerts.some(
    (alert) =>
      getAlertLevel(alert) ===
      "warning"
  );

  if (
    hasWarningAlert ||
    statuses.some(
      (status) =>
        status === "warning"
    )
  ) {
    return "warning";
  }

  return "normal";
}
