// ✅ src/utils/triggerState.ts

const triggerMemory = new Map<string, number>();

export function hasRecentlyTriggered(symbol: string, cooldownMinutes = 10): boolean {
  const last = triggerMemory.get(symbol);
  if (!last) return false;

  const now = Date.now();
  return now - last < cooldownMinutes * 60 * 1000;
}

export function markTriggered(symbol: string) {
  triggerMemory.set(symbol, Date.now());
}
