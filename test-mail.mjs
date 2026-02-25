// 测试邮件发送脚本
// 运行：node test-mail.mjs

import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.exmail.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: 'swjtu@b1ank.cn',
    pass: 'xnWYxJALVVUq3W9U',
  },
})

const mockActivity = {
  title: '【测试】西南交大第二课堂监控系统上线通知',
  category: '学术科技与创新创业',
  location: '犀浦校区二教2539',
  startTime: '星期三 2月26日 19:30',
  regEnd: '2026-02-26 18:00:00',
  description: '这是一条测试活动推送，说明邮件通知功能已正常工作。实际使用时，当第二课堂出现新活动时将自动发送此类通知。',
  url: 'http://ocw.swjtu.edu.cn/yethan/YouthIndex?setAction=courseList',
}

const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">
  <h2 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:8px;">
    西南交大第二课堂 · 1 条新活动
  </h2>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;">
    <h3 style="margin:0 0 8px;color:#003087;">
      <a href="${mockActivity.url}" style="text-decoration:none;color:#003087;">${mockActivity.title}</a>
    </h3>
    <p style="margin:4px 0;color:#6b7280;font-size:14px;">${mockActivity.category}</p>
    <p style="margin:4px 0;font-size:14px;">地点：${mockActivity.location}</p>
    <p style="margin:4px 0;font-size:14px;">时间：${mockActivity.startTime}</p>
    <p style="margin:4px 0;font-size:14px;">截止：${mockActivity.regEnd}</p>
    <p style="margin:8px 0 0;font-size:13px;color:#374151;">${mockActivity.description}</p>
    <a href="${mockActivity.url}" style="display:inline-block;margin-top:10px;padding:6px 14px;background:#003087;color:#fff;border-radius:4px;text-decoration:none;font-size:13px;">查看详情</a>
  </div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#9ca3af;text-align:center;">
    您收到此邮件是因为订阅了西南交大第二课堂活动通知。
    <a href="http://localhost:3000/api/unsubscribe/test-token" style="color:#6b7280;">退订</a>
  </p>
</body>
</html>`

try {
  const info = await transporter.sendMail({
    from: '"交大第二课堂" <swjtu@b1ank.cn>',
    to: '8393455@qq.com',
    subject: `【新活动】${mockActivity.title}`,
    html,
  })
  console.log('发送成功！Message ID:', info.messageId)
} catch (err) {
  console.error('发送失败:', err.message)
}
