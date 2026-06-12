import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST (req) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return Response.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const record = await prisma.verificationToken.findUnique({
      where: { token }
    })

    if (!record || record.expires < new Date()) {
      return Response.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { email: record.identifier },
      data: { password: hashed }
    })

    await prisma.verificationToken.delete({ where: { token } })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
