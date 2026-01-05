const COST_PER_MINUTE = 0.12;

export function calculateCost(minutes: number) {
  return minutes * COST_PER_MINUTE;
}
