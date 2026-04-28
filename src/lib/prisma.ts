import { PrismaClient } from '../generated/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.warn('[PRISMA] No DATABASE_URL found')
    return new PrismaClient()
  }

  console.log('[PRISMA] Initializing High-Stability Client')
  
  // We are using the standard PrismaClient which works perfectly with Neon 
  // when using a pooled connection string (usually ends with -pooler)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
