export function log(message: string, ...args: unknown[]) {
  console.log(`[Yappaflow] ${message}`, ...args);
}

export function logError(message: string, ...args: unknown[]) {
  console.error(`[Yappaflow ERROR] ${message}`, ...args);
}
