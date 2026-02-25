import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const rows = await prisma.activity.findMany({
    select: { category: true },
    distinct: ['category'],
    where: { category: { not: '' } },
    orderBy: { category: 'asc' },
  })
  return NextResponse.json(rows.map(r => r.category))
}
