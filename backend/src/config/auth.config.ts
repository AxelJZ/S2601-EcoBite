// NOTE: Defines authentication and cookie environment configuration.
import { registerAs } from '@nestjs/config';
import { expiresInToMs } from '../modules/auth/auth.utils';

function parseCookieSameSite(
  raw: string | undefined,
): 'strict' | 'lax' | 'none' {
  const v = (raw ?? 'strict').toLowerCase();
  if (v === 'lax' || v === 'none') {
    return v;
  }
  return 'strict';
}

export default registerAs('auth', () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const jwtExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d';

  const cookieMaxAgeRaw = process.env.COOKIE_MAX_AGE;
  const cookieMaxAge =
    cookieMaxAgeRaw !== undefined && cookieMaxAgeRaw !== ''
      ? Number(cookieMaxAgeRaw)
      : expiresInToMs(jwtExpiresIn);

  const secureRaw = process.env.COOKIE_SECURE;
  const cookieSecure =
    secureRaw === 'true' ||
    secureRaw === '1' ||
    (secureRaw === undefined && nodeEnv === 'production');

  return {
    jwtExpiresIn,
    cookieMaxAge: Number.isFinite(cookieMaxAge)
      ? cookieMaxAge
      : expiresInToMs(jwtExpiresIn),
    refreshTokenExpiresIn,
    refreshCookieMaxAge: expiresInToMs(refreshTokenExpiresIn),
    accessCookieName: process.env.ACCESS_COOKIE_NAME?.trim() || 'access_token',
    refreshCookieName:
      process.env.REFRESH_COOKIE_NAME?.trim() || 'refresh_token',
    csrfCookieName: process.env.CSRF_COOKIE_NAME?.trim() || 'csrf_token',
    csrfHeaderName:
      process.env.CSRF_HEADER_NAME?.trim().toLowerCase() || 'x-csrf-token',
    jwtIssuer: process.env.JWT_ISSUER ?? 'isp-manager-api',
    jwtAudience: process.env.JWT_AUDIENCE ?? 'isp-manager-api',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    cookieSameSite: parseCookieSameSite(process.env.COOKIE_SAMESITE),
    cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    cookieSecure,
  };
});
