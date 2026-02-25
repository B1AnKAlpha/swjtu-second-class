import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendAdminUnsubscribeNotice } from '@/lib/mailer'

// POST /api/unsubscribe  body: { email }
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: '请输入邮箱' }, { status: 400 })

  const result = await prisma.subscriber.updateMany({
    where: { email, active: true },
    data: { active: false },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: '该邮箱未订阅或已退订' }, { status: 404 })
  }

  sendAdminUnsubscribeNotice(email).catch(console.error)
  return NextResponse.json({ ok: true })
}
