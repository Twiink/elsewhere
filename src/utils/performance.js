export const TIERS = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };

export function detectPerformanceTier(device = globalThis.navigator ?? {}) {
  const mobile = /iPhone|iPad|iPod|Android/i.test(device.userAgent ?? '');
  if (device.deviceMemory && device.deviceMemory <= 4) return TIERS.LOW;
  if (device.hardwareConcurrency && device.hardwareConcurrency <= 4) return mobile ? TIERS.LOW : TIERS.MEDIUM;
  return mobile ? TIERS.MEDIUM : TIERS.HIGH;
}

export function canPrefetchRooms(device = globalThis.navigator ?? {}, tier = detectPerformanceTier(device)) {
  return tier === TIERS.HIGH && !device.connection?.saveData && !/^(slow-)?2g$/.test(device.connection?.effectiveType ?? '');
}
