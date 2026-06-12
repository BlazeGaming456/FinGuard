import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return Response.json({ error: "All fields are required" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    })

    return Response.json({ success: true }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}