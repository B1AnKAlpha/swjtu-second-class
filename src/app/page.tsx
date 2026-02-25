'use client'

import { useState, useEffect, useCallback } from 'react'
import ActivityCard, { type ActivityItem } from '@/components/ActivityCard'
import FilterBar from '@/components/FilterBar'
import SubscribeModal from '@/components/SubscribeModal'
import UnsubscribeModal from '@/components/UnsubscribeModal'

export default function HomePage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showUnsub, setShowUnsub] = useState(false)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (category) params.set('category', category)
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    const res = await fetch(`/api/activities?${params}`)
    const data = await res.json()
    setItems(data.items)
    setTotal(data.total)
    setLoading(false)
  }, [page, category, type, status])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  function handleFilter(key: 'category' | 'type' | 'status', value: string) {
    setPage(1)
    if (key === 'category') setCategory(value)
    else if (key === 'type') setType(value)
    else setStatus(value)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-swjtu">西南交大第二课堂</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 条活动</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)} className="btn-primary">
            订阅通知
          </button>
          <button
            onClick={() => setShowUnsub(true)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            取消订阅
          </button>
        </div>
      </div>

      <div className="mb-5">
        <FilterBar category={category} type={type} status={status} onChange={handleFilter} />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">暂无活动</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <ActivityCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:border-swjtu"
          >
            上一页
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:border-swjtu"
          >
            下一页
          </button>
        </div>
      )}

      {showModal && <SubscribeModal onClose={() => setShowModal(false)} />}
      {showUnsub && <UnsubscribeModal onClose={() => setShowUnsub(false)} />}
    </div>
  )
}
