import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendBroadcastNotice } from '@/lib/mailer'

interface BroadcastBody {
  target?: 'all' | 'email'
  email?: string
  subject?: string
  title?: string
  message?: string
  buttonText?: string
  buttonUrl?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function unauthorized() {
  return NextResponse.json({ error: '未授权' }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.ADMIN_BROADCAST_TOKEN
  if (!expectedToken) {
    return NextResponse.json(
      { error: '服务端未配置 ADMIN_BROADCAST_TOKEN' },
      { status: 500 }
    )
  }

  const providedToken = req.headers.get('x-admin-token') ?? ''
  if (!providedToken || providedToken !== expectedToken) {
    return unauthorized()
  }

  let body: BroadcastBody = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: '请求体必须是合法 JSON，且需包含 message 字段' },
      { status: 400 }
    )
  }

  const rawMessage = body.message?.trim()
  if (!rawMessage) {
    return NextResponse.json(
      { error: 'message 不能为空，已阻止群发' },
      { status: 400 }
    )
  }

  const target = body.target ?? 'all'
  if (target !== 'all' && target !== 'email') {
    return NextResponse.json(
      { error: 'target 仅支持 all 或 email' },
      { status: 400 }
    )
  }

  const singleEmail = body.email?.trim() ?? ''
  if (target === 'email' && !isValidEmail(singleEmail)) {
    return NextResponse.json(
      { error: 'target=email 时必须提供合法 email' },
      { status: 400 }
    )
  }

  const subject = body.subject?.trim() || '【网站更新通知】西南交大第二课堂监控已更新'
  const title = body.title?.trim() || '西南交大第二课堂监控网站更新通知'
  const message = rawMessage
  const buttonUrl =
    body.buttonUrl?.trim() || process.env.NEXT_PUBLIC_BASE_URL || 'https://class.b1ank.cn'
  const buttonText = body.buttonText?.trim() || '打开网站'

  const recipientEmails =
    target === 'email'
      ? [singleEmail]
      : (
          await prisma.subscriber.findMany({
            where: { active: true },
            select: { email: true },
          })
        ).map(s => s.email)

  if (recipientEmails.length === 0) {
    return NextResponse.json({ ok: true, target, total: 0, success: 0, fail: 0 })
  }

  let success = 0
  const failed: Array<{ email: string; reason: string }> = []

  for (const email of recipientEmails) {
    try {
      await sendBroadcastNotice({
        email,
        subject,
        title,
        message,
        buttonUrl,
        buttonText,
      })
      success += 1
    } catch (err: unknown) {
      failed.push({
        email,
        reason: err instanceof Error ? err.message : '发送失败',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    target,
    total: recipientEmails.length,
    success,
    fail: failed.length,
    failed: failed.slice(0, 20),
  })
}
