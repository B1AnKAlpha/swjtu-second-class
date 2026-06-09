import cron from 'node-cron'
import { prisma } from './db'
import { scrapeActivities } from './scraper'
import { sendNotification } from './mailer'
import type { Activity, ScrapeResult } from './scraper'

let initialized = false

async function refreshNewFlagsByFirstSeen() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  await prisma.activity.updateMany({
    where: { firstSeen: { gte: threeDaysAgo } },
    data: { isNew: true },
  })

  await prisma.activity.updateMany({
    where: { firstSeen: { lt: threeDaysAgo } },
    data: { isNew: false },
  })
}

/** 执行一次完整的抓取+通知流程 */
export async function runScrapeJob() {
  console.log('[scheduler] 开始抓取...')

  let scrapeResult: ScrapeResult
  try {
    scrapeResult = await scrapeActivities()
  } catch (err) {
    console.error('[scheduler] 抓取失败:', err)
    return
  }

  const fetchedAll: Activity[] = scrapeResult.activities
  const keepIds: string[] = scrapeResult.keepIds

  if (fetchedAll.length === 0 && keepIds.length === 0) return

  // 仅保留本次抓取到的前 50 条
  const fetched = fetchedAll.slice(0, 50)
  const fetchedIds = fetched.map(a => a.id)
  const protectedIds = Array.from(new Set([...fetchedIds, ...keepIds]))

  // 本轮没有可处理活动时，仅做保留/清理，不触发入库更新与通知。
  if (fetched.length === 0) {
    await prisma.activity.deleteMany({
      where: { id: { notIn: protectedIds } },
    })
    await refreshNewFlagsByFirstSeen()
    console.log(`[scheduler] 本轮无可处理活动，保留满员活动 ${keepIds.length} 条`)
    return
  }

  // 首次抓取用于控制是否发送通知（首次初始化不发）。
  const existingCount = await prisma.activity.count()
  const isFirstRun = existingCount === 0

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

  // 恢复检测：如果本轮超过 40% 的活动在 DB 中不存在，说明 DB 数据已过期
  // （网站恢复访问或活动大量轮换），此时跳过通知避免 spam。
  const isRecoveryRun =
    !isFirstRun &&
    fetched.length > 0 &&
    newActivities.length > fetched.length * 0.4

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
          notified: isFirstRun || isRecoveryRun,
          isNew: true,
        },
      })
    )
  )

  // 仅保留本轮抓取到的 50 条，其他历史数据删除
  await prisma.activity.deleteMany({
    where: { id: { notIn: protectedIds } },
  })

  // 每轮抓取后按“入库时间距当前是否<=3天”统一刷新 NEW 标记。
  await refreshNewFlagsByFirstSeen()

  console.log(
    `[scheduler] 同步 ${fetched.length} 条（新增 ${newActivities.length} 条）${isFirstRun ? '（首次初始化，不发通知）' : ''}${isRecoveryRun ? '（恢复运行，跳过通知）' : ''}`
  )

  // 首次初始化或恢复运行时不发邮件
  if (isFirstRun || isRecoveryRun) return

  if (newActivities.length === 0) {
    console.log('[scheduler] 无新活动')
    return
  }

  // 查询所有活跃订阅者
  const subscribers = await prisma.subscriber.findMany({ where: { active: true } })

  for (const sub of subscribers) {
    const categories: string[] = JSON.parse(sub.categories)

    // 按订阅分类过滤（空数组=全部）
    const matched = newActivities.filter(a => {
      const catOk = categories.length === 0 || categories.includes(a.category)
      return catOk
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
