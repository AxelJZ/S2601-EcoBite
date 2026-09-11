// NOTE: Validates required environment variables before startup.
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().default('isp-manager-api'),
  JWT_AUDIENCE: Joi.string().default('isp-manager-api'),

  ACCESS_COOKIE_NAME: Joi.string().default('access_token'),
  REFRESH_COOKIE_NAME: Joi.string().default('refresh_token'),
  COOKIE_SAMESITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .insensitive()
    .default('strict'),
  COOKIE_DOMAIN: Joi.string().allow(''),
  COOKIE_SECURE: Joi.string().valid('true', 'false', '1', '0'),
  COOKIE_MAX_AGE: Joi.number().integer().positive(),

  APP_NAME: Joi.string().allow(''),
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  FRONTEND_ORIGINS: Joi.string().allow(''),
  TRUST_PROXY: Joi.string().valid('true', 'false'),

  LOG_LEVEL: Joi.string().allow(''),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false'),
  SENTRY_DSN: Joi.string().uri().allow(''),
  SENTRY_ENABLED: Joi.string().valid('true', 'false'),
  SENTRY_SEND_DEFAULT_PII: Joi.string().valid('true', 'false'),
  CSRF_COOKIE_NAME: Joi.string().default('csrf_token'),
  CSRF_HEADER_NAME: Joi.string().default('x-csrf-token'),
}).unknown(true);
