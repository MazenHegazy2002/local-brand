import { PrismaClient } from '../generated/client'
import { neonConfig, Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('[PRISMA] DATABASE_URL is missing')
    return new PrismaClient()
  }

  // Neon Configuration
  if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws
  }

  try {
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool as any)
    console.log('[PRISMA] Initializing with Neon Adapter')
    return new PrismaClient({ adapter } as any)
  } catch (e) {
    console.error('[PRISMA] Adapter failed, falling back to standard client:', e)
    return new PrismaClient()
  }
}

let prismaInstance: PrismaClient;

try {
  prismaInstance = globalForPrisma.prisma ?? createPrismaClient()
} catch (e) {
  console.error('[PRISMA] Critical initialization failure:', e)
  prismaInstance = new PrismaClient()
}

export const prisma = prismaInstance

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
