// NOTE: Fetches CSRF tokens for e2e requests that mutate state.
import type { Test } from 'supertest';

export const CSRF_HEADER = 'X-CSRF-Token';

export function csrfFromSetCookie(
  headers: Record<string, string | string[] | undefined>,
): string {
  const raw = headers['set-cookie'];
  const cookies = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? [raw]
      : [];
  const csrf = cookies.find((cookie) => cookie.startsWith('csrf_token='));
  if (!csrf) {
    throw new Error('Missing csrf_token set-cookie header');
  }
  return csrf.split(';')[0]?.split('=')[1] ?? '';
}

type CsrfAgent = {
  get: (url: string) => Test;
};

export async function fetchCsrf(agent: CsrfAgent): Promise<string> {
  const res = await agent.get('/auth/csrf').expect(200);
  const token = (res.body as { data?: { token?: unknown } }).data?.token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Missing csrf token response body');
  }
  return token;
}
