import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendAdminUnsubscribeNotice } from '@/lib/mailer'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const subscriber = await prisma.subscriber.findFirst({
    where: { token: params.token, active: true },
  })

  if (!subscriber) {
    return new NextResponse('链接无效或已退订', { status: 404 })
  }

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { active: false },
  })

  sendAdminUnsubscribeNotice(subscriber.email).catch(console.error)

  return new NextResponse(
    `<!DOCTYPE html><html lang="zh-CN"><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>✅ 已成功退订</h2>
      <p style="color:#6b7280">您将不再收到西南交大第二课堂活动通知。</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
