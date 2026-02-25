'use client'

import { useState } from 'react'

const CATEGORIES = [
  '社会实践与志愿服务',
  '学术科技与创新创业',
  '社会工作与领导能力',
  '文化沟通与交往能力',
  '艺术体验与审美修养',
  '心理素质与身体素质',
  '思想政治与道德素养',
]
const TYPES = ['竞赛', '讲座', '活动']

export default function SubscribeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [isUpdate, setIsUpdate] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (categories.length === 0 || types.length === 0) {
      setErrMsg(categories.length === 0 ? '请至少选择一个活动分类' : '请至少选择一个活动类型')
      setStatus('error')
      return
    }
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, categories, types }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? '订阅失败')
      }
      const d = await res.json()
      setIsUpdate(d.isUpdate)
      setStatus('ok')
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : '订阅失败')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        {status === 'ok' ? (
          <div className="text-center py-6">
            <h3 className="text-lg font-semibold mb-1">{isUpdate ? '已更新订阅' : '订阅成功'}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {isUpdate ? '订阅偏好已更新，' : ''}有新活动时将发送邮件到 {email}
            </p>
            <button onClick={onClose} className="btn-primary">关闭</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">订阅活动通知</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <label className="block text-sm font-medium mb-1">邮箱地址</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-swjtu"
            />

            <label className="block text-sm font-medium mb-2">活动分类</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setCategories(toggle(categories, c))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    categories.includes(c)
                      ? 'bg-swjtu text-white border-swjtu'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-swjtu'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium mb-2">活动类型</label>
            <div className="flex gap-2 mb-5">
              {TYPES.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setTypes(toggle(types, t))}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    types.includes(t)
                      ? 'bg-swjtu text-white border-swjtu'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-swjtu'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-500 mb-3">{errMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-primary w-full disabled:opacity-60"
            >
              {status === 'loading' ? '订阅中...' : '确认订阅'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
