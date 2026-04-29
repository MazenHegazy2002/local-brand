import { PrismaClient } from '../generated/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.warn('[PRISMA] No DATABASE_URL found — returning unconfigured client')
    return new PrismaClient()
  }

  console.log('[PRISMA] Initializing Neon Serverless Adapter Client')

  // PrismaNeon (v6) accepts a PoolConfig object, not a Pool instance
  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
