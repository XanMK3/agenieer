export function logCreated(filePath: string): void {
  console.log(`  create  ${filePath}`);
}

export function logUpdated(filePath: string): void {
  console.log(`  update  ${filePath}`);
}

export function logSkipped(filePath: string, reason: string): void {
  console.log(`  skip    ${filePath} (${reason})`);
}

export function logConflict(filePath: string, reason: string): void {
  console.error(`  conflict ${filePath} (${reason})`);
}

export function logRouteActivated(tech: string): void {
  console.log(`  + route ${tech}`);
}

export function logRouteDeactivated(tech: string): void {
  console.log(`  - route ${tech}`);
}

export function logInfo(msg: string): void {
  console.log(`info: ${msg}`);
}

export function logWarn(msg: string): void {
  console.warn(`warn: ${msg}`);
}

export function logError(msg: string): void {
  console.error(`error: ${msg}`);
}

export const logger = {
  logCreated,
  logUpdated,
  logSkipped,
  logConflict,
  logRouteActivated,
  logRouteDeactivated,
  logInfo,
  logWarn,
  logError,
};
