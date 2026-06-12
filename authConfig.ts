import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!
    }),
    Credentials({ credentials: {} })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt ({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
      }
      return token
    },
    async session ({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string
      }
      return session
    },
    authorized ({ auth }) {
      return !!auth?.user
    }
  },
  pages: { signIn: '/login' }
}
