'use client'

export interface ActivityItem {
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
  firstSeen: string
  isNew: boolean
}

export default function ActivityCard({ item }: { item: ActivityItem }) {
  const isEnded = item.regEnd ? new Date(item.regEnd) < new Date() : false

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base sm:text-lg font-semibold text-swjtu hover:underline leading-snug"
        >
          {item.title}
        </a>
        <div className="flex gap-1 shrink-0 mt-0.5">
          {item.isNew && !isEnded && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              NEW
            </span>
          )}
          {isEnded && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              已结束
            </span>
          )}
        </div>
      </div>

      {item.category && (
        <p className="text-xs text-gray-500 mb-2">{item.category}</p>
      )}

      {item.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {item.description}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-x-4 sm:gap-y-2 text-xs sm:text-sm text-gray-500 bg-gray-50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none mt-1 sm:mt-0">
        {item.location && <span className="truncate">地点：{item.location}</span>}
        {item.startTime && <span>时间：{item.startTime}</span>}
        {item.regEnd && <span>截止：{item.regEnd}</span>}
        {item.capacity > 0 && (
          <span>报名：{item.registered}/{item.capacity}</span>
        )}
      </div>
    </div>
  )
}
