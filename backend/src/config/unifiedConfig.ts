import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  url: string;
}

interface ServerConfig {
  port: number;
  nodeEnv: string;
}

interface SentryConfig {
  dsn: string;
  enabled: boolean;
}

interface UnifiedConfig {
  database: DatabaseConfig;
  server: ServerConfig;
  sentry: SentryConfig;
}

const config: UnifiedConfig = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    enabled: !!process.env.SENTRY_DSN,
  },
};

// Validate required configuration
if (!config.database.url) {
  console.error('ERROR: DATABASE_URL is required in environment variables');
  console.error('Please check your .env file');
  process.exit(1);
}

export { config };
