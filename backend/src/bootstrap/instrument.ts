// NOTE: Initializes runtime instrumentation before the Nest app starts.
import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

const sentryEnabled = process.env.SENTRY_ENABLED === 'true';
const dsn = process.env.SENTRY_DSN?.trim();

if (sentryEnabled && dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true',
    environment: process.env.NODE_ENV ?? 'development',
  });
}
