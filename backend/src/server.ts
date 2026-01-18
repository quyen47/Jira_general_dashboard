import { createApp } from './app.js';
import { config } from './config/unifiedConfig.js';
import { logger } from './utils/logger.js';

/**
 * Start the HTTP server
 */
function startServer() {
  try {
    const app = createApp();
    const port = config.server.port;

    const server = app.listen(port, () => {
      logger.info(`Backend server running on http://localhost:${port}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      logger.info(`Sentry enabled: ${config.sentry.enabled}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();
