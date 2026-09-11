// NOTE: Applies shared HTTP middleware, validation, CORS, and guards setup.
import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import appConfig from '../config/app.config';

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'X-CSRF-Token',
];

export function setupHttpLayer(
  app: INestApplication,
  appCfg: ConfigType<typeof appConfig>,
): void {
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: number) => void;
  };

  app.use(cookieParser());

  if (appCfg.trustProxy) {
    expressApp.set('trust proxy', 1);
  }

  const rawOrigins = appCfg.frontendOrigins;
  const list = rawOrigins
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (appCfg.nodeEnv === 'production' && (!list || list.length === 0)) {
    throw new Error('FRONTEND_ORIGINS is required in production');
  }

  const origin: boolean | string[] = list && list.length > 0 ? list : true;

  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: DEFAULT_ALLOWED_HEADERS,
  });
}
