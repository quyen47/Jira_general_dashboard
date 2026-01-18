import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const sentryDsn = process.env.SENTRY_DSN || '';

// Only initialize Sentry if DSN is provided
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      nodeProfilingIntegration(),
    ],
  });
  
  console.log('Sentry initialized');
} else {
  console.log('Sentry DSN not provided, skipping Sentry initialization');
}

export default Sentry;
