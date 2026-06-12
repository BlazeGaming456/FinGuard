import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from '@/lib/prisma'
import { authConfig } from '@/authConfig'
import bcrypt from 'bcryptjs'

// ── Full config — Node.js only (used by API routes) ──────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma as any),
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize (credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) return null

        return { id: String(user.id), email: user.email, name: user.name }
      }
    })
  ]
})
