let usage = 0;

export function addUsage(cost: number) {
  usage += cost;
}

export function getUsage() {
  return usage;
}
