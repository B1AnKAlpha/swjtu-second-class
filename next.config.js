/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许服务端调度器在 Next.js 启动时初始化
  serverExternalPackages: ['node-cron', 'nodemailer', 'cheerio'],
}

module.exports = nextConfig
