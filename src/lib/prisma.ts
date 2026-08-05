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

  // Neon serverless postgres: use WebSocket adapter
  if (connectionString.includes('neon.tech') || connectionString.includes('neon')) {
    neonConfig.webSocketConstructor = ws;
    const url = new URL(connectionString);
    if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '10');
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '10');

    const adapter = new PrismaNeon({ connectionString: url.toString() });

    return new PrismaClient({
      adapter,
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

  // Standard PostgreSQL connection (Docker / Local / VPS)
  return new PrismaClient({
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
