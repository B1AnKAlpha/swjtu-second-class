import cron from 'node-cron'
import { prisma } from './db'
import { scrapeActivities } from './scraper'
import { sendNotification } from './mailer'
import type { Activity } from './scraper'

let initialized = false

/** 执行一次完整的抓取+通知流程 */
export async function runScrapeJob() {
  console.log('[scheduler] 开始抓取...')
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // 清理已入库但尚未开始报名的活动（regStart > 当前时间）
  const removedNotStarted = await prisma.activity.deleteMany({
    where: {
      AND: [
        { regStart: { not: '' } },
        { regStart: { gt: now } },
      ],
    },
  })
  if (removedNotStarted.count > 0) {
    console.log(`[scheduler] 清理未开始报名活动 ${removedNotStarted.count} 条`)
  }

  let fetchedAll: Activity[]
  try {
    fetchedAll = await scrapeActivities()
  } catch (err) {
    console.error('[scheduler] 抓取失败:', err)
    return
  }

  if (fetchedAll.length === 0) return

  // 仅保留本次抓取到的前 50 条
  const fetched = fetchedAll.slice(0, 50)

  // 首次抓取（数据库为空）= 历史数据，isNew 全部为 false
  // 后续抓取出现的新 ID = 真正的新活动，isNew = true
  const existingCount = await prisma.activity.count()
  const isFirstRun = existingCount === 0

  const fetchedIds = fetched.map(a => a.id)

  // 找出本轮抓取中数据库里尚不存在的新活动
  const existingIds = isFirstRun
    ? new Set<string>()
    : new Set(
        (await prisma.activity.findMany({
          where: { id: { in: fetchedIds } },
          select: { id: true },
        })).map(a => a.id)
      )
  const newActivities = fetched.filter(a => !existingIds.has(a.id))

  // 每轮都同步活动数据（含已报名人数），已存在记录会被更新
  await prisma.$transaction(
    fetched.map(a =>
      prisma.activity.upsert({
        where: { id: a.id },
        update: {
          title: a.title,
          description: a.description,
          location: a.location,
          startTime: a.startTime,
          regStart: a.regStart,
          regEnd: a.regEnd,
          capacity: a.capacity,
          registered: a.registered,
          category: a.category,
          type: a.type,
          organizer: a.organizer,
          url: a.url,
        },
        create: {
          ...a,
          notified: isFirstRun,
          isNew: !isFirstRun,
        },
      })
    )
  )

  // 仅保留本轮抓取到的 50 条，其他历史数据删除
  await prisma.activity.deleteMany({
    where: { id: { notIn: fetchedIds } },
  })

  console.log(
    `[scheduler] 同步 ${fetched.length} 条（新增 ${newActivities.length} 条）${isFirstRun ? '（首次初始化，不发通知）' : ''}`
  )

  // 首次初始化不发邮件
  if (isFirstRun) return

  if (newActivities.length === 0) {
    console.log('[scheduler] 无新活动')
    return
  }

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
