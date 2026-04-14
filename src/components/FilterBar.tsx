'use client'

import { useState, useEffect } from 'react'

const STATUSES = ['即将开课', '正在进行', '已经结束']

interface Props {
  category: string
  status: string
  onChange: (key: 'category' | 'status', value: string) => void
}

export default function FilterBar({ category, status, onChange }: Props) {
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
      </div>
    </div>
  )
}
