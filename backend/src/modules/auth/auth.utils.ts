// NOTE: Provides authentication utility functions for duration parsing.
import type { Request } from 'express';

export function expiresInToMs(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
  if (!m) {
    return 15 * 60 * 1000;
  }
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  const mult: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (mult[u] ?? 60_000);
}

export function readCookie(req: Request, name: string): string | undefined {
  const bag = req.cookies as Record<string, unknown> | undefined;
  if (!bag) {
    return undefined;
  }
  const value = bag[name];
  return typeof value === 'string' ? value : undefined;
}
