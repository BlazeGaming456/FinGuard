import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

function createPrismaClient () {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
}

function getClient () {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

async function resetClient () {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect().catch(() => {})
  }
  globalForPrisma.prisma = createPrismaClient()
  return globalForPrisma.prisma
}

function isConnectionError (error) {
  const message = error?.message || ''
  return (
    error?.code === 'P1001' ||
    error?.code === 'P1008' ||
    error?.code === 'P1017' ||
    message.includes('Server has closed the connection') ||
    message.includes('Connection terminated') ||
    message.includes('ECONNRESET') ||
    message.includes('Connection refused')
  )
}

export async function withPrismaRetry (operation) {
  let client = getClient()

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await client.$connect()
      return await operation(client)
    } catch (error) {
      if (attempt === 0 && isConnectionError(error)) {
        client = await resetClient()
        continue
      }
      throw error
    }
  }

  throw new Error('Database operation failed after reconnecting.')
}

const prisma = getClient()
export default prisma
