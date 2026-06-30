import { PrismaClient } from '../generated/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    });
  }

  // Neon serverless: use WebSocket for edge/serverless, tune pool params to
  // recycle idle connections quickly and avoid exhausting the connection limit.
  neonConfig.webSocketConstructor = ws;

  // Append Neon pool-mode connection params when not already present.
  // DIRECT_URL should point to the unpooled endpoint for migrations.
  const url = new URL(connectionString);
  if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '10');
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '10');

  const adapter = new PrismaNeon({ connectionString: url.toString() });

  return new PrismaClient({
    adapter,
    // In development, log slow queries (>200ms) to help catch N+1 issues.
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
