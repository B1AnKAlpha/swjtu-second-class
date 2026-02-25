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
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
        <select
          value={category}
          onChange={e => onChange('category', e.target.value)}
          className="w-full sm:w-auto text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-swjtu"
        >
          <option value="">全部分类</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={e => onChange('status', e.target.value)}
          className="w-full sm:w-auto text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-swjtu"
        >
          <option value="">全部状态</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={type}
          onChange={e => onChange('type', e.target.value)}
          className="col-span-2 sm:hidden w-full text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-swjtu"
        >
          <option value="">全部类型</option>
          {TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="hidden sm:flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
        <button
          onClick={() => onChange('type', '')}
          className={`shrink-0 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
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
            className={`shrink-0 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
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
