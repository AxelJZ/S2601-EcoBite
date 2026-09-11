// NOTE: Generates CSRF tokens for cookie-based mutation protection.
import { randomBytes } from 'crypto';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}
