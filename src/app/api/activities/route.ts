import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { initScheduler } from '@/lib/scheduler'

initScheduler()

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 10

  const categoryFilter = category ? Prisma.sql`AND category = ${category}` : Prisma.sql``

  // 状态过滤：按报名人数判断
  // 报名人数未满：capacity > 0 且 registered < capacity
  // 报名人数已满：capacity > 0 且 registered >= capacity
  const statusFilter =
    status === '报名人数未满' ? Prisma.sql`AND capacity > 0 AND registered < capacity` :
    status === '报名人数已满' ? Prisma.sql`AND capacity > 0 AND registered >= capacity` :
    Prisma.sql``

  const offset = (page - 1) * pageSize

  const [countResult, items] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Activity"
      WHERE 1=1 ${categoryFilter} ${statusFilter}
    `,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM "Activity"
      WHERE 1=1 ${categoryFilter} ${statusFilter}
      ORDER BY
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
