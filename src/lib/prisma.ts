import { PrismaClient } from '../generated/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Use WebSockets in Node.js environment (Vercel serverless)
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!

  if (!connectionString) {
    console.error('DATABASE_URL is not set!')
    return new PrismaClient()
  }

  // Neon serverless adapter — works in both local and Vercel serverless
  // It uses WebSockets to connect, which works in all environments
  try {
    const { Pool } = require('@neondatabase/serverless')
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool)
    return new PrismaClient({ adapter } as any)
  } catch (e) {
    console.error('Failed to create Neon adapter, falling back to standard:', e)
    return new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
