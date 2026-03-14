export interface StructuredLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

/**
 * Creates a structured log entry for consistent logging across services.
 */
export function createLogEntry(
  level: StructuredLog['level'],
  service: string,
  message: string,
  meta?: Record<string, unknown>,
): StructuredLog {
  return {
    level,
    service,
    message,
    timestamp: new Date().toISOString(),
    meta,
  };
}
