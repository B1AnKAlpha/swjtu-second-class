import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '西南交大第二课堂监控',
  description: '实时监控西南交通大学第二课堂活动，支持邮件订阅通知',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
