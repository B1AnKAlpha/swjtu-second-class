import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendBroadcastNotice } from '@/lib/mailer'

interface BroadcastBody {
  subject?: string
  title?: string
  message?: string
  buttonText?: string
  buttonUrl?: string
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
    body = {}
  }

  const subject = body.subject?.trim() || '【网站更新通知】西南交大第二课堂监控已更新'
  const title = body.title?.trim() || '西南交大第二课堂监控网站更新通知'
  const message =
    body.message?.trim() ||
    '你好，网站已完成一次功能更新。\n活动列表和订阅逻辑已按最新规则调整，请以当前网站显示与通知为准。'
  const buttonUrl =
    body.buttonUrl?.trim() || process.env.NEXT_PUBLIC_BASE_URL || 'https://class.b1ank.cn'
  const buttonText = body.buttonText?.trim() || '打开网站'

  const subscribers = await prisma.subscriber.findMany({
    where: { active: true },
    select: { email: true },
  })

  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, total: 0, success: 0, fail: 0 })
  }

  let success = 0
  const failed: Array<{ email: string; reason: string }> = []

  for (const { email } of subscribers) {
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
    total: subscribers.length,
    success,
    fail: failed.length,
    failed: failed.slice(0, 20),
  })
}
