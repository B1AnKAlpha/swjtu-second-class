import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { initScheduler } from '@/lib/scheduler'

initScheduler()

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category') ?? ''
  const type = searchParams.get('type') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 10

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const categoryFilter = category ? Prisma.sql`AND category = ${category}` : Prisma.sql``
  const typeFilter = type ? Prisma.sql`AND type = ${type}` : Prisma.sql``

  // 状态过滤：用 regEnd 近似判断
  // 即将开课：报名未截止（regEnd > now）
  // 正在进行：无截止时间（regEnd = ''）
  // 已经结束：报名已截止（regEnd != '' AND regEnd < now）
  const statusFilter =
    status === '即将开课' ? Prisma.sql`AND regEnd > ${now}` :
    status === '正在进行' ? Prisma.sql`AND regEnd = ''` :
    status === '已经结束' ? Prisma.sql`AND regEnd != '' AND regEnd < ${now}` :
    Prisma.sql``

  const offset = (page - 1) * pageSize

  const [countResult, items] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Activity"
      WHERE 1=1 ${categoryFilter} ${typeFilter} ${statusFilter}
    `,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM "Activity"
      WHERE 1=1 ${categoryFilter} ${typeFilter} ${statusFilter}
      ORDER BY
        CASE WHEN regEnd = '' OR regEnd > ${now} THEN 0 ELSE 1 END ASC,
        firstSeen DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
  ])

  const total = Number(countResult[0].count)

  const normalized = items.map(item => ({
    ...item,
    isNew: Boolean(item.isNew),
    notified: Boolean(item.notified),
  }))

  return NextResponse.json({ total, page, pageSize, items: normalized })
}
