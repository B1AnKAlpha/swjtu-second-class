import nodemailer from 'nodemailer'
import type { Activity } from './scraper'

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST ?? 'smtp.exmail.qq.com',
  port: parseInt(process.env.MAIL_PORT ?? '465'),
  secure: process.env.MAIL_SECURE !== 'false',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

function activityHtml(a: Activity) {
  return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;">
      <h3 style="margin:0 0 8px;color:#003087;">
        <a href="${a.url}" style="text-decoration:none;color:#003087;">${a.title}</a>
      </h3>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">${a.category || '未分类'}</p>
      ${a.location ? `<p style="margin:4px 0;font-size:14px;">地点：${a.location}</p>` : ''}
      ${a.startTime ? `<p style="margin:4px 0;font-size:14px;">时间：${a.startTime}</p>` : ''}
      ${a.regEnd ? `<p style="margin:4px 0;font-size:14px;">截止：${a.regEnd}</p>` : ''}
      ${a.description ? `<p style="margin:8px 0 0;font-size:13px;color:#374151;">${a.description.slice(0, 120)}${a.description.length > 120 ? '...' : ''}</p>` : ''}
      <a href="${a.url}" style="display:inline-block;margin-top:10px;padding:6px 14px;background:#003087;color:#fff;border-radius:4px;text-decoration:none;font-size:13px;">查看详情</a>
    </div>`
}

/** 有新订阅时通知管理员 */
export async function sendAdminSubscribeNotice(
  subscriberEmail: string,
  categories: string[],
  types: string[],
) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const catText = categories.length > 0 ? categories.join('、') : '全部'
  const typeText = types.length > 0 ? types.join('、') : '全部'

  await transporter.sendMail({
    from: `"交大第二课堂" <${process.env.MAIL_USER}>`,
    to: adminEmail,
    subject: `【新订阅】${subscriberEmail}`,
    html: `
      <p>有新用户订阅了第二课堂活动通知：</p>
      <ul>
        <li>邮箱：${subscriberEmail}</li>
        <li>活动分类：${catText}</li>
        <li>活动类型：${typeText}</li>
      </ul>`,
  })
}

/** 有人退订时通知管理员 */
export async function sendAdminUnsubscribeNotice(subscriberEmail: string) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  await transporter.sendMail({
    from: `"交大第二课堂" <${process.env.MAIL_USER}>`,
    to: adminEmail,
    subject: `【退订】${subscriberEmail}`,
    html: `<p>用户 <strong>${subscriberEmail}</strong> 已退订第二课堂活动通知。</p>`,
  })
}

export async function sendNotification(
  email: string,
  unsubToken: string,
  activities: Activity[]
) {
  if (activities.length === 0) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const unsubUrl = `${baseUrl}/api/unsubscribe/${unsubToken}`

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head><meta charset="UTF-8"><title>西南交大第二课堂新活动</title></head>
    <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">
      <h2 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:8px;">
        西南交大第二课堂 · ${activities.length} 条新活动
      </h2>
      ${activities.map(activityHtml).join('')}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="font-size:12px;color:#9ca3af;text-align:center;">
        您收到此邮件是因为订阅了西南交大第二课堂活动通知。
        <a href="${unsubUrl}" style="color:#6b7280;">退订</a>
      </p>
    </body>
    </html>`

  await transporter.sendMail({
    from: `"交大第二课堂" <${process.env.MAIL_USER}>`,
    to: email,
    subject: activities.length === 1
      ? `【新活动】${activities[0].title}`
      : `【新活动】${activities[0].title} 等 ${activities.length} 条`,
    html,
  })
}
