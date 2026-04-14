import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'http://ocw.swjtu.edu.cn/yethan'
const LIST_URL = `${BASE_URL}/YouthIndex?setAction=courseList`

const TYPE_KEYS: Record<string, string> = {
  竞赛: '61E92EF67418DC54',
  讲座: '0E4BF4D36E232918',
  活动: '22251884ACC79046',
}

export interface Activity {
  id: string
  title: string
  description: string
  location: string
  startTime: string
  regStart: string
  regEnd: string
  capacity: number
  registered: number
  category: string
  type: string
  organizer: string
  url: string
}

function parseDateTime(raw: string): Date | null {
  const text = raw.trim()
  if (!text) return null
  const dt = new Date(text.replace(' ', 'T'))
  return Number.isNaN(dt.getTime()) ? null : dt
}

function sanitizeLocation(raw: string): string {
  // 去掉地点尾部重复的报名人数，如“... 0/180”
  return raw.replace(/\s+\d+\s*\/\s*\d+\s*$/, '').trim()
}

function pickFirstNonEmpty(values: Array<string | undefined>): string {
  for (const value of values) {
    const text = (value ?? '').trim()
    if (text) return text
  }
  return ''
}

function isNotStartedRegistrationText(text: string): boolean {
  return /暂未开始报名|未开始报名|报名未开始|未到报名时间/.test(text)
}

function buildClient() {
  return axios.create({
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0',
      Referer: LIST_URL,
      ...(process.env.SWJTU_COOKIE ? { Cookie: process.env.SWJTU_COOKIE } : {}),
    },
  })
}

function parseItems(html: string, typeLabel: string): Activity[] {
  const $ = cheerio.load(html)
  const activities: Activity[] = []
  const now = new Date()

  $('ul.process-list > li').each((_, el) => {
    const $el = $(el)

    const onclick = $el.find('p.list-tit').attr('onclick') ?? ''
    const idMatch = onclick.match(/getCourseInfo\('([^']+)'\)/)
    if (!idMatch) return
    const id = idMatch[1]

    const title = $el.find('p.list-tit').text().trim()
    if (!title) return

    const category = $el.find('.list-tips span').eq(1).text().trim()
    const description = $el.find('p.list-txt').text().replace(/^简介[：:]/, '').trim()
    const startTime = $el.find('.list-cont-top span.times').first().text().trim()

    const numSpans = $el.find('.cont-num > div:first-child span')
    const registered = parseInt(numSpans.eq(1).text().trim()) || 0
    const capacity = parseInt(numSpans.eq(2).text().replace('/', '').trim()) || 0

    const location = sanitizeLocation($el.find('.list-cont-bottom span.times').first().text().trim())
    const regStart = pickFirstNonEmpty([
      $el.find('.startTime').attr('v'),
      $el.find('.beginTime').attr('v'),
      $el.find('.regStart').attr('v'),
      $el.find('.bmStartTime').attr('v'),
      $el.find('.startTime').first().text(),
      $el.find('.beginTime').first().text(),
      $el.find('.regStart').first().text(),
      $el.find('.bmStartTime').first().text(),
    ])
    const regEnd = $el.find('.endTime').attr('v') ?? ''

    const statusText = pickFirstNonEmpty([
      $el.find('.btn').text(),
      $el.find('.apply-btn').text(),
      $el.find('.sign-btn').text(),
      $el.find('.list-cont-bottom').text(),
      $el.text(),
    ])

    // 页面已标记为“暂未开始报名”的活动直接过滤。
    if (isNotStartedRegistrationText(statusText)) return

    // 报名开始时间晚于当前抓取时间，视为未开放报名，不入库。
    const regStartAt = parseDateTime(regStart)
    if (regStartAt && regStartAt > now) return

    // 退课/报名截止时间已早于当前抓取时间的课程，视为不可选，不入库。
    const regEndAt = parseDateTime(regEnd)
    if (regEndAt && regEndAt <= now) return

    activities.push({
      id, title, description, location, startTime,
      regStart, regEnd, capacity, registered,
      category, type: typeLabel, organizer: '',
      url: `${BASE_URL}/YouthIndex?courseid=${id}&setAction=courseInfo`,
    })
  })

  return activities
}

async function scrapeByType(
  client: ReturnType<typeof buildClient>,
  typeLabel: string,
  key2: string,
  maxPages: number,
): Promise<Activity[]> {
  const all: Activity[] = []
  const baseForm = { key1: '', key2, key3: '', key4: '', key5: '', key6: '', key7: '' }

  let firstHtml: string
  try {
    const res = await client.get(`${LIST_URL}&key2=${key2}`)
    firstHtml = res.data as string
  } catch (err) {
    console.error(`[scraper] ${typeLabel} 首页请求失败:`, err)
    return []
  }

  all.push(...parseItems(firstHtml, typeLabel))

  const $ = cheerio.load(firstHtml)
  const totalText = $('ul li').filter((_, el) => $(el).text().includes('共') && $(el).text().includes('页')).text()
  const totalMatch = totalText.match(/共(\d+)页/)
  const totalPages = totalMatch ? Math.min(parseInt(totalMatch[1]), maxPages) : 1

  for (let page = 2; page <= totalPages; page++) {
    try {
      const body = new URLSearchParams({ ...baseForm, jumpPage: String(page) }).toString()
      const res = await client.post(LIST_URL, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      all.push(...parseItems(res.data as string, typeLabel))
    } catch (err) {
      console.error(`[scraper] ${typeLabel} 第 ${page} 页失败:`, err)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`[scraper] ${typeLabel} 抓取 ${all.length} 条，${totalPages} 页`)
  return all
}

export async function scrapeActivities(maxPages = 3): Promise<Activity[]> {
  const client = buildClient()
  const seen = new Set<string>()
  const all: Activity[] = []

  for (const [typeLabel, key2] of Object.entries(TYPE_KEYS)) {
    const items = await scrapeByType(client, typeLabel, key2, maxPages)
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        all.push(item)
      }
    }
  }

  console.log(`[scraper] 共抓取 ${all.length} 条（去重后）`)
  return all
}
