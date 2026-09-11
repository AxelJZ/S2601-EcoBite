// NOTE: Provides reusable user fixtures for unit tests.
import { Role } from '@prisma/client';
import type { UserSafe } from '../auth-user.service';

export function makeUserSafe(overrides: Partial<UserSafe> = {}): UserSafe {
  const now = new Date('2026-05-01T12:00:00.000Z');
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Fixture User',
    email: 'fixture@example.com',
    phone: null,
    role: Role.INSTALLER,
    active: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
