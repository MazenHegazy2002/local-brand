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
    console.warn('[PRISMA] No DATABASE_URL found, using basic client')
    return new PrismaClient()
  }

  // Use standard client for local development or if not using Neon
  if (process.env.NODE_ENV === 'development' || !connectionString.includes('neon.tech')) {
    console.log('[PRISMA] Initializing standard client (Local/Non-Neon)')
    return new PrismaClient()
  }

  // Neon Adapter for Production/Serverless
  try {
    if (typeof window === 'undefined') {
      neonConfig.webSocketConstructor = ws
    }
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool as any)
    console.log('[PRISMA] Initializing with Neon Adapter (Production)')
    return new PrismaClient({ adapter } as any)
  } catch (e) {
    console.error('[PRISMA] Adapter failed, falling back to standard client:', e)
    return new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
