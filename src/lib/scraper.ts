import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'http://ocw.swjtu.edu.cn/yethan'
const LIST_URL = `${BASE_URL}/YouthIndex?setAction=courseList`

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

export interface ScrapeResult {
  activities: Activity[]
  keepIds: string[]
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

function isNotOpenForRegistration(text: string): boolean {
  return /不可报名/.test(text)
}

function isFullActivity(registered: number, capacity: number): boolean {
  return capacity > 0 && registered >= capacity
}

function shouldKeepFullActivity(
  registered: number,
  capacity: number,
  regEndAt: Date | null,
  now: Date,
): boolean {
  if (capacity <= 0 || registered < capacity) return false
  // 满员但仍在报名期（或无法判断截止时间）时保留，避免名额释放后重复推送。
  return !regEndAt || regEndAt > now
}

function buildClient() {
  return axios.create({
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G9910) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.105 Mobile Safari/537.36 MMWEBID/2972 MicroMessenger/8.0.38.2420(0x2800263A) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64',
      'X-Requested-With': 'com.tencent.mm',
      Referer: LIST_URL,
      ...(process.env.SWJTU_COOKIE ? { Cookie: process.env.SWJTU_COOKIE } : {}),
    },
  })
}

function parseItems(html: string): ScrapeResult {
  const $ = cheerio.load(html)
  const activities: Activity[] = []
  const keepIds = new Set<string>()
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
    const regEndAt = parseDateTime(regEnd)

    const statusText = pickFirstNonEmpty([
      $el.find('.btn').text(),
      $el.find('.apply-btn').text(),
      $el.find('.sign-btn').text(),
      $el.find('.cont-btn').text(),
      $el.find('.list-cont-bottom').text(),
      $el.text(),
    ])

    // 满员活动不再参与本轮抓取处理；但在报名期内保留其 ID，避免误删数据库已有记录。
    if (isFullActivity(registered, capacity)) {
      if (shouldKeepFullActivity(registered, capacity, regEndAt, now)) {
        keepIds.add(id)
      }
      return
    }

    // 退课/报名截止时间已早于当前抓取时间的课程，视为不可选，不入库。
    if (regEndAt && regEndAt <= now) return

    activities.push({
      id, title, description, location, startTime,
      regStart, regEnd, capacity, registered,
      category, type: '', organizer: '',
      url: `${BASE_URL}/YouthIndex?courseid=${id}&setAction=courseInfo`,
    })
  })

  return { activities, keepIds: Array.from(keepIds) }
}

async function scrapeAll(
  client: ReturnType<typeof buildClient>,
  maxPages: number,
): Promise<ScrapeResult> {
  const all: Activity[] = []
  const keepIds = new Set<string>()
  const baseForm = { key1: '', key2: '', key3: '', key4: '', key5: '', key6: '', key7: '' }

  let firstHtml: string
  try {
    const res = await client.get(LIST_URL)
    firstHtml = res.data as string
  } catch (err) {
    console.error('[scraper] 全部活动首页请求失败:', err)
    return { activities: [], keepIds: [] }
  }

  const firstParsed = parseItems(firstHtml)
  all.push(...firstParsed.activities)
  for (const id of firstParsed.keepIds) keepIds.add(id)

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
      const parsed = parseItems(res.data as string)
      all.push(...parsed.activities)
      for (const id of parsed.keepIds) keepIds.add(id)
    } catch (err) {
      console.error(`[scraper] 全部活动第 ${page} 页失败:`, err)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`[scraper] 全部活动抓取 ${all.length} 条，${totalPages} 页`)
  return { activities: all, keepIds: Array.from(keepIds) }
}

export async function scrapeActivities(maxPages = 20): Promise<ScrapeResult> {
  const client = buildClient()
  const seen = new Set<string>()
  const all: Activity[] = []
  const keepIds = new Set<string>()

  const scraped = await scrapeAll(client, maxPages)
  for (const item of scraped.activities) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      all.push(item)
    }
  }
  for (const id of scraped.keepIds) keepIds.add(id)

  console.log(`[scraper] 共抓取 ${all.length} 条（去重后）`)
  return { activities: all, keepIds: Array.from(keepIds) }
}
