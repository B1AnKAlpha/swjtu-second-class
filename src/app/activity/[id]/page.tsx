import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const a = await prisma.activity.findUnique({ where: { id: params.id } })
  if (!a) return { title: '活动不存在' }
  return { title: `${a.title} - 西南交大第二课堂` }
}

export default async function ActivityDetailPage({ params }: { params: { id: string } }) {
  const a = await prisma.activity.findUnique({ where: { id: params.id } })
  if (!a) notFound()

  const isEnded = a.regEnd ? new Date(a.regEnd) < new Date() : false
  const isFull = a.capacity > 0 && a.registered >= a.capacity

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-400 hover:text-swjtu mb-4 inline-block">
        ← 返回活动列表
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <h1 className="text-xl font-bold text-swjtu flex-1">{a.title}</h1>
          <div className="flex gap-1 shrink-0">
            {a.isNew && !isEnded && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">NEW</span>
            )}
            {isEnded && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已结束</span>
            )}
            {isFull && !isEnded && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">已满</span>
            )}
          </div>
        </div>

        {a.category && (
          <p className="text-sm text-gray-500 mb-4">{a.category}</p>
        )}

        {a.description && (
          <p className="text-sm text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{a.description}</p>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-600">
          {a.location && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">地点</span>
              <span>{a.location}</span>
            </div>
          )}
          {a.startTime && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">时间</span>
              <span>{a.startTime}</span>
            </div>
          )}
          {a.regStart && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">报名开始</span>
              <span>{a.regStart}</span>
            </div>
          )}
          {a.regEnd && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">报名截止</span>
              <span>{a.regEnd}{isEnded ? '（已截止）' : ''}</span>
            </div>
          )}
          {a.capacity > 0 && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">报名人数</span>
              <span>{a.registered}/{a.capacity}{a.registered >= a.capacity ? '（已满）' : ''}</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
          此页面仅供展示活动信息，报名请通过学校第二课堂系统操作。
        </div>
      </div>
    </div>
  )
}
