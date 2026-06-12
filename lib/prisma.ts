import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'

const client = globalThis.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalThis.prisma = client

export default client
