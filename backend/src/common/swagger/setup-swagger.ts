// NOTE: Configures OpenAPI document generation and Swagger UI.
import { type INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import appConfig from '../../config/app.config';

export function setupSwagger(
  app: INestApplication,
  appCfg: ConfigType<typeof appConfig>,
): void {
  const disableInProd =
    appCfg.nodeEnv === 'production' && !appCfg.swaggerEnabled;
  if (disableInProd) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('ISP Manager API')
    .setDescription(
      [
        'ISP manager API.',
        '',
        '**Authentication:** `POST /auth/signup` creates a public installer account and session cookies. `POST /auth/login` signs in with credentials. Access (`ACCESS_COOKIE_NAME`, default `access_token`) and refresh (`REFRESH_COOKIE_NAME`, default `refresh_token`) cookies are httpOnly. The `Authorization: Bearer <access JWT>` header is also supported.',
        '',
        '**CORS / cookies:** the client must use `credentials: true` and define `FRONTEND_ORIGINS` (CSV). Cookies use `SameSite=strict` by default (`COOKIE_SAMESITE`); cross-site SPAs may need `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`.',
        '',
        '**Successful responses:** every endpoint returns JSON wrapped by the global interceptor:',
        '`success`, `statusCode`, `statusText`, `timestamp`, `path`, `data` - each operation schema describes the contents of `data`.',
        '',
        '**Errors:** response body with `success: false`, `code` (when applicable), `message`, and `errors` for validation failures.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addCookieAuth('access-cookie', {
      type: 'apiKey',
      in: 'cookie',
      name: appCfg.accessCookieName,
      description:
        'Access JWT in an httpOnly cookie (the bearer scheme can also use the same token).',
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access JWT (same value as the httpOnly `access_token` cookie or the name configured in `ACCESS_COOKIE_NAME`).',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/swagger.json',
  });
}
