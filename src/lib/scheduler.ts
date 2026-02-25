import cron from 'node-cron'
import { prisma } from './db'
import { scrapeActivities } from './scraper'
import { sendNotification } from './mailer'
import type { Activity } from './scraper'

let initialized = false

/** 执行一次完整的抓取+通知流程 */
export async function runScrapeJob() {
  console.log('[scheduler] 开始抓取...')
  let fetched: Activity[]
  try {
    fetched = await scrapeActivities()
  } catch (err) {
    console.error('[scheduler] 抓取失败:', err)
    return
  }

  if (fetched.length === 0) return

  // 首次抓取（数据库为空）= 历史数据，isNew 全部为 false
  // 后续抓取出现的新 ID = 真正的新活动，isNew = true
  const existingCount = await prisma.activity.count()
  const isFirstRun = existingCount === 0

  // 找出数据库中不存在的新活动
  const existingIds = isFirstRun
    ? new Set<string>()
    : new Set(
        (await prisma.activity.findMany({ select: { id: true } })).map(a => a.id)
      )
  const newActivities = fetched.filter(a => !existingIds.has(a.id))

  if (newActivities.length === 0) {
    console.log('[scheduler] 无新活动')
    return
  }

  // 写入数据库：首次抓取标记为历史数据（isNew=false），后续新增才标 true
  await prisma.activity.createMany({
    data: newActivities.map(a => ({ ...a, notified: isFirstRun, isNew: !isFirstRun })),
  })
  console.log(`[scheduler] 新增 ${newActivities.length} 条活动${isFirstRun ? '（首次初始化，不发通知）' : ''}`)

  // 首次初始化不发邮件
  if (isFirstRun) return

  // 查询所有活跃订阅者
  const subscribers = await prisma.subscriber.findMany({ where: { active: true } })

  for (const sub of subscribers) {
    const categories: string[] = JSON.parse(sub.categories)
    const types: string[] = JSON.parse(sub.types)

    // 按订阅过滤（空数组=全部）
    const matched = newActivities.filter(a => {
      const catOk = categories.length === 0 || categories.includes(a.category)
      const typeOk = types.length === 0 || types.includes(a.type)
      return catOk && typeOk
    })

    if (matched.length === 0) continue

    try {
      await sendNotification(sub.email, sub.token, matched)
      console.log(`[scheduler] 已通知 ${sub.email}，${matched.length} 条`)
    } catch (err) {
      console.error(`[scheduler] 发送邮件失败 ${sub.email}:`, err)
    }
  }

  // 标记已通知
  await prisma.activity.updateMany({
    where: { id: { in: newActivities.map(a => a.id) } },
    data: { notified: true },
  })
}

/** 初始化定时任务（每 30 分钟执行一次，仅初始化一次） */
export function initScheduler() {
  if (initialized) return
  initialized = true

  // 每 30 分钟执行
  cron.schedule('*/30 * * * *', () => {
    runScrapeJob().catch(console.error)
  })

  // 启动时立即执行一次
  runScrapeJob().catch(console.error)
  console.log('[scheduler] 定时任务已启动（每30分钟）')
}
