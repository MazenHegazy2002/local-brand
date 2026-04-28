import { PrismaClient } from '../generated/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('DATABASE_URL is not set! Prisma will fail.')
    return new PrismaClient()
  }

  // Use WebSockets only if we are in a Node.js/Serverless environment
  // and NOT in an Edge runtime (Edge has its own fetch/pool logic)
  if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws
  }

  try {
    const { Pool } = require('@neondatabase/serverless')
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool)
    return new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    } as any)
  } catch (e) {
    console.warn('Neon serverless adapter unavailable, falling back to standard PrismaClient:', e)
    return new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
