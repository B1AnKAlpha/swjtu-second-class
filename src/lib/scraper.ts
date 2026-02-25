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

    const location = $el.find('.list-cont-bottom span.times').first().text().trim()
    const regEnd = $el.find('.endTime').attr('v') ?? ''

    activities.push({
      id, title, description, location, startTime,
      regStart: '', regEnd, capacity, registered,
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
