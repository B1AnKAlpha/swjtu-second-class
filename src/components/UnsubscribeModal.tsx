'use client'

import { useState } from 'react'

export default function UnsubscribeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? '退订失败')
      setStatus('ok')
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : '退订失败')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        {status === 'ok' ? (
          <div className="text-center py-6">
            <h3 className="text-lg font-semibold mb-1">已退订</h3>
            <p className="text-sm text-gray-500 mb-4">{email} 将不再收到活动通知</p>
            <button onClick={onClose} className="btn-primary">关闭</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">取消订阅</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <label className="block text-sm font-medium mb-1">订阅时使用的邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-swjtu"
            />
            {status === 'error' && (
              <p className="text-sm text-red-500 mb-3">{errMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-2 text-sm border border-gray-300 rounded-lg hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-60"
            >
              {status === 'loading' ? '处理中...' : '确认退订'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
