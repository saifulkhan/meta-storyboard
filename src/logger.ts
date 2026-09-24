/**
 * Lightweight logging facade for the library.
 *
 * By default only warnings and errors are printed; debug output is enabled
 * with `setDebug(true)` (or by providing a custom handler via `setLogger`).
 * This keeps the library quiet in consuming applications while preserving
 * diagnostics during development.
 */

export type LogHandler = (...args: unknown[]) => void;

export interface Logger {
  debug: LogHandler;
  warn: LogHandler;
  error: LogHandler;
}

let debugEnabled = false;

let handlers: Logger = {
  // eslint-disable-next-line no-console
  debug: (...args: unknown[]) => console.debug(...args),
  // eslint-disable-next-line no-console
  warn: (...args: unknown[]) => console.warn(...args),
  // eslint-disable-next-line no-console
  error: (...args: unknown[]) => console.error(...args),
};

/** enable or disable debug-level logging (off by default) */
export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

/** returns whether debug-level logging is enabled */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/** replace the default console-backed handlers, e.g., to route into an app logger */
export function setLogger(custom: Partial<Logger>): void {
  handlers = { ...handlers, ...custom };
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (debugEnabled) handlers.debug(...args);
  },
  warn: (...args: unknown[]): void => {
    handlers.warn(...args);
  },
  error: (...args: unknown[]): void => {
    handlers.error(...args);
  },
};
