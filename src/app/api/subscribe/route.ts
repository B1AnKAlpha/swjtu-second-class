import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendAdminSubscribeNotice } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  const { email, categories = [], types = [] } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  }

  const existing = await prisma.subscriber.findUnique({ where: { email } })
  const isUpdate = !!existing

  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    update: {
      categories: JSON.stringify(categories),
      types: JSON.stringify(types),
      active: true,
    },
    create: {
      email,
      categories: JSON.stringify(categories),
      types: JSON.stringify(types),
    },
  })

  sendAdminSubscribeNotice(email, categories, types).catch(console.error)

  return NextResponse.json({ ok: true, isUpdate, id: subscriber.id })
}
