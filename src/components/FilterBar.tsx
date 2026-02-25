'use client'

import { useState, useEffect } from 'react'

const TYPES = ['竞赛', '讲座', '活动']

const STATUSES = ['即将开课', '正在进行', '已经结束']

interface Props {
  category: string
  type: string
  status: string
  onChange: (key: 'category' | 'type' | 'status', value: string) => void
}

export default function FilterBar({ category, type, status, onChange }: Props) {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={category}
        onChange={e => onChange('category', e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-swjtu"
      >
        <option value="">全部分类</option>
        {categories.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={status}
        onChange={e => onChange('status', e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-swjtu"
      >
        <option value="">全部状态</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="flex gap-1">
        <button
          onClick={() => onChange('type', '')}
          className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
            type === ''
              ? 'bg-swjtu text-white border-swjtu'
              : 'border-gray-300 hover:border-swjtu'
          }`}
        >
          全部
        </button>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => onChange('type', t)}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
              type === t
                ? 'bg-swjtu text-white border-swjtu'
                : 'border-gray-300 hover:border-swjtu'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
