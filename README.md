<div align="center">
  <h1>西南交大第二课堂活动监控</h1>
  <p>一个实时监控西南交通大学第二课堂活动的 Web 应用，支持自定义条件订阅与邮件通知。</p>
  <p>
    <a href="https://class.b1ank.cn"><strong>在线体验：class.b1ank.cn</strong></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Blue?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </p>
</div>

## 功能特性

- **实时监控**：每半小时自动抓取最新活动数据。
- **多维筛选**：支持按活动分类、类型（竞赛/讲座/活动）、状态（即将开课/正在进行/已经结束）进行筛选。
- **智能排序**：未结束的活动优先展示，最新发布的活动带有 `NEW` 标识。
- **邮件订阅**：
  支持按个人偏好（特定分类和类型）订阅活动通知，有新活动发布时，系统会自动发送邮件提醒。提供一键退订功能。




## 本地运行

### 1. 克隆项目

```bash
git clone https://github.com/B1AnKAlpha/swjtu-second-class.git
cd swjtu-second-class
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 文件并重命名为 `.env`，然后填入你的配置信息：

```bash
cp .env.example .env
```

### 4. 初始化数据库

```bash
npx prisma db push
```

### 5. 启动开发服务器

```bash
npm run dev
```
打开浏览器访问 `http://localhost:3000` 即可预览。

## 环境变量说明

| 变量名 | 说明 | 示例/默认值 |
|--------|------|-------------|
| `DATABASE_URL` | SQLite 数据库文件路径 | `file:./data.db` |
| `MAIL_HOST` | SMTP 服务器地址 | `smtp.qq.com` |
| `MAIL_PORT` | SMTP 服务器端口 | `465` |
| `MAIL_USER` | 发件人邮箱账号 | `your-email@qq.com` |
| `MAIL_PASS` | 发件人邮箱密码或授权码 | `your-auth-code` |
| `NEXT_PUBLIC_BASE_URL` | 网站部署域名（用于生成退订链接） | `https://class.b1ank.cn` |
| `ADMIN_EMAIL` | 管理员邮箱（接收用户订阅/退订通知） | `admin@example.com` |
| `ADMIN_BROADCAST_TOKEN` | 管理员群发接口鉴权 token | `replace-with-a-long-random-string` |

## 管理员群发接口

部署后可调用管理员群发接口，向生产数据库中的所有活跃订阅用户发送通知邮件。

注意：为避免误发，接口要求请求体必须是合法 JSON，且 `message` 不能为空；否则会返回 `400` 并拒绝发送。

接口参数：
- `target`：`all`（默认，发给所有活跃订阅用户）或 `email`（仅发给指定邮箱）
- `email`：当 `target=email` 时必填

```bash
curl -X POST "https://class.b1ank.cn/api/admin/broadcast" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_BROADCAST_TOKEN" \
  -d '{
    "subject": "【网站更新通知】西南交大第二课堂监控已更新",
    "title": "西南交大第二课堂监控网站更新通知",
    "message": "你好，网站已完成一次功能更新。\n请访问网站查看最新活动。",
    "buttonText": "打开网站",
    "buttonUrl": "https://class.b1ank.cn"
  }'
```

返回值会包含 `total/success/fail` 统计。

仅发给单个邮箱（调试推荐）：

```bash
curl -X POST "https://class.b1ank.cn/api/admin/broadcast" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_BROADCAST_TOKEN" \
  -d '{
    "target": "email",
    "email": "8393455@qq.com",
    "subject": "【网站更新通知】西南交大第二课堂监控已修复",
    "title": "西南交大第二课堂监控网站更新通知",
    "message": "你好，我们这边刚完成了一次小更新。\n已修复重复推送的问题。",
    "buttonText": "打开网站",
    "buttonUrl": "https://class.b1ank.cn"
  }'
```

全量群发（发给所有活跃订阅用户）：

```bash
curl -X POST "https://class.b1ank.cn/api/admin/broadcast" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_BROADCAST_TOKEN" \
  -d '{
    "target": "all",
    "subject": "【网站更新通知】西南交大第二课堂监控已修复",
    "title": "西南交大第二课堂监控网站更新通知",
    "message": "你好，我们这边刚完成了一次小更新。\n已修复重复推送的问题。",
    "buttonText": "打开网站",
    "buttonUrl": "https://class.b1ank.cn"
  }'
```

PowerShell（Windows）示例：

```powershell
$token = "你的ADMIN_BROADCAST_TOKEN"
$body = @{
  subject = "【网站更新通知】西南交大第二课堂监控已更新"
  title = "西南交大第二课堂监控网站更新通知"
  message = "你好，网站已完成一次功能更新。`n请访问网站查看最新活动。"
  buttonText = "打开网站"
  buttonUrl = "https://class.b1ank.cn"
} | ConvertTo-Json

Invoke-RestMethod -Method Post \
  -Uri "https://class.b1ank.cn/api/admin/broadcast" \
  -Headers @{ "x-admin-token" = $token } \
  -ContentType "application/json" \
  -Body $body
```

## 部署指南

### PM2 部署
项目根目录已提供 `ecosystem.config.js`，可直接使用 PM2 进行进程管理：
```bash
npm run build
pm2 start ecosystem.config.js
```

### GitHub Actions 自动化部署
项目已配置 CI/CD 工作流。只需在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中配置以下 Secrets，推送到 `main` 分支后即可自动部署到你的服务器：
- `VPS_HOST`：服务器 IP 地址
- `VPS_USER`：服务器登录用户名
- `VPS_SSH_KEY`：服务器 SSH 私钥
- `VPS_PORT`：SSH 端口

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。
