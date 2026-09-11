// NOTE: Defines database connection configuration for Prisma.
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL ?? '',
}));
