'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity, Plus, Pencil, Trash2, Star, Clock,
  ChevronDown, ChevronUp, RefreshCw, ListFilter, ExternalLink
} from 'lucide-react'

interface ActivityEntry {
  id: string
  type: 'create' | 'update' | 'delete' | 'status_change' | 'favorite_toggle'
  programName: string
  programId: string
  employeeName?: string
  departmentName?: string
  entityType?: string
  details: string
  timestamp: string
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  create: { icon: Plus, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'إضافة' },
  update: { icon: Pencil, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'تعديل' },
  delete: { icon: Trash2, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'حذف' },
  status_change: { icon: Activity, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'تغيير حالة' },
  favorite_toggle: { icon: Star, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'مفضلة' },
}

// Filter pills configuration
const FILTER_PILLS = [
  { key: 'all', label: 'الكل' },
  { key: 'create', label: 'إضافة' },
  { key: 'update', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
]

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `منذ ${diffMin} د`
  if (diffHr < 24) return `منذ ${diffHr} س`
  if (diffDay < 7) return `منذ ${diffDay} ي`
  return date.toLocaleDateString('ar-SA')
}

export default function ActivityPanel() {
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Active filter (Feature 6)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [showAll, setShowAll] = useState(false)

  const fetchActivities = useCallback(async () => {
    try {
      const limit = showAll ? 50 : 15
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      if (activeFilter !== 'all') params.set('type', activeFilter)

      const res = await fetch(`/api/activity?${params}`)
      if (res.ok) {
        const json = await res.json()
        setActivities(json.data || [])
        setTotalCount(json.total || 0)
        setTypeCounts(json.typeCounts || {})
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [activeFilter, showAll])

  useEffect(() => {
    fetchActivities()
    intervalRef.current = setInterval(fetchActivities, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchActivities])

  return (
    <div className="surface-card overflow-hidden">
      {/* Header - always visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded) } }}
        role="button"
        tabIndex={0}
        className="w-full flex items-center justify-between p-4 text-right activity-header-gradient cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <Activity className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">سجل النشاط</h3>
            <p className="text-[11px] text-muted-foreground">
              آخر التحديثات على البرامج
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {totalCount}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => { e.stopPropagation(); fetchActivities() }}
            aria-label="تحديث سجل النشاط"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Filter Pills (Feature 6) */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <ListFilter className="size-3 text-muted-foreground shrink-0" />
              {FILTER_PILLS.map((pill) => {
                const isActive = activeFilter === pill.key
                const count = pill.key === 'all' ? totalCount : (typeCounts[pill.key] || 0)
                return (
                  <button
                    key={pill.key}
                    onClick={() => { setActiveFilter(pill.key); setShowAll(false) }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {pill.label}
                    {count > 0 && (
                      <span className={`text-[9px] ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <div className="empty-state-icon mx-auto">
                <Clock className="size-6 text-emerald-500/50 dark:text-emerald-400/50" />
              </div>
              <p className="text-sm text-muted-foreground">لا يوجد نشاط حتى الآن</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                ستظهر هنا التحديثات عند تعديل البرامج
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className={`max-h-64 ${showAll ? 'max-h-96' : ''}`}>
                <div className="p-3 space-y-1">
                  {activities.map((activity, index) => {
                    const config = typeConfig[activity.type] || typeConfig.update
                    const Icon = config.icon
                    const staggerClass = index < 8 ? `animate-activity-row-${index + 1}` : ''

                    return (
                      <div
                        key={activity.id}
                        className={`flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/30 transition-colors ${staggerClass}`}
                      >
                        <div className={`flex size-7 items-center justify-center rounded-lg ${config.bg} flex-shrink-0 mt-0.5`}>
                          <Icon className={`size-3.5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-foreground leading-relaxed line-clamp-2">
                              {activity.details || activity.programName}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {relativeTime(activity.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-0 bg-muted badge-depth">
                              {config.label}
                            </Badge>
                            {activity.departmentName && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {activity.departmentName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              {/* View All Button (Feature 6) */}
              {!showAll && totalCount > 15 && (
                <div className="px-4 pb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
                    onClick={() => setShowAll(true)}
                  >
                    <ExternalLink className="size-3" />
                    عرض الكل ({totalCount})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
