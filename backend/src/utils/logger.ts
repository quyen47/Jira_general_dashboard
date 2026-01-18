import * as Sentry from '@sentry/node';

/**
 * Centralized logger utility
 * Replaces console.log with structured logging
 */
class Logger {
  info(message: string, meta?: Record<string, any>): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  error(message: string, error?: unknown, meta?: Record<string, any>): void {
    console.error(`[ERROR] ${message}`, error, meta || '');
    
    // Send to Sentry if error is provided
    if (error) {
      Sentry.captureException(error, {
        tags: meta,
        contexts: {
          custom: {
            message,
          },
        },
      });
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  }
}

export const logger = new Logger();
