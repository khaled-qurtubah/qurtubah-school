'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, AlertTriangle, List } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants'
import type { Program } from '@/lib/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

const PROGRESS_BAR_COLORS: Record<string, string> = {
  'bg-emerald-500': '#10b981',
  'bg-blue-500': '#3b82f6',
  'bg-yellow-500': '#eab308',
  'bg-red-500': '#ef4444',
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500'
  if (value >= 50) return 'bg-blue-500'
  if (value >= 25) return 'bg-yellow-500'
  return 'bg-red-500'
}

interface OverdueResponse {
  data: Program[]
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="notification-dot-pulse absolute -top-1 -left-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-bounce-subtle">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ProgramItem({ program }: { program: Program }) {
  const statusColor = STATUS_COLORS[program.status] || STATUS_COLORS['لم تبدأ']
  const priorityColor = PRIORITY_COLORS[program.priority] || PRIORITY_COLORS['متوسطة']
  const progressBg = getProgressColor(program.progress)
  const progressHex = PROGRESS_BAR_COLORS[progressBg] || '#ef4444'

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 p-3 transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-700/40">
      {/* Program name */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-tight line-clamp-1">
          {program.name}
        </h4>
        <Badge
          variant="outline"
          className={`${statusColor.bg} ${statusColor.text} border-0 text-[10px] px-1.5 py-0 h-5 flex-shrink-0`}
        >
          {program.status}
        </Badge>
      </div>

      {/* Department + Priority row */}
      <div className="flex items-center gap-2 text-xs">
        {program.department && (
          <span className="text-gray-500 dark:text-gray-400 truncate">
            {program.department.name}
          </span>
        )}
        <Badge
          variant="outline"
          className={`${priorityColor.bg} ${priorityColor.text} border-0 text-[10px] px-1.5 py-0 h-5 flex-shrink-0`}
        >
          {program.priority}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="relative h-1.5 flex-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${program.progress}%`, backgroundColor: progressHex }}
          />
        </div>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 w-7 text-left flex-shrink-0">
          {program.progress}%
        </span>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-gray-100 dark:border-gray-700/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const filters = useAppStore(s => s.filters)
  const setFilter = useAppStore(s => s.setFilter)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const year = filters.year

  const fetchOverdue = useCallback(async () => {
    if (!year) return
    setLoading(true)
    setError(null)
    try {
      // Fetch both in-progress and not-started programs in parallel
      const [resInProgress, resNotStarted] = await Promise.all([
        fetch(
          `/api/programs?year=${year}&status=${encodeURIComponent('قيد التنفيذ')}&limit=20`
        ),
        fetch(
          `/api/programs?year=${year}&status=${encodeURIComponent('لم تبدأ')}&limit=20`
        ),
      ])

      if (!resInProgress.ok || !resNotStarted.ok) {
        throw new Error('فشل في تحميل البيانات')
      }

      const dataInProgress: OverdueResponse = await resInProgress.json()
      const dataNotStarted: OverdueResponse = await resNotStarted.json()

      // Merge, filter progress < 100, and sort by urgency
      const all = [...(dataInProgress.data || []), ...(dataNotStarted.data || [])]
        .filter(p => p.progress < 100)
        .sort((a, b) => {
          // Priority sorting: عاجلة > عالية > متوسطة > منخفضة
          const priorityOrder: Record<string, number> = {
            'عاجلة': 0, 'عالية': 1, 'متوسطة': 2, 'منخفضة': 3,
          }
          const pDiff = (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
          if (pDiff !== 0) return pDiff
          // Then by progress ascending (least progress = more urgent)
          return a.progress - b.progress
        })

      setPrograms(all)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    if (open) {
      fetchOverdue()
    }
  }, [open, fetchOverdue])

  const handleShowAll = () => {
    setActiveTab('programs')
    setFilter('status', 'قيد التنفيذ')
    setOpen(false)
  }

  const displayPrograms = programs.slice(0, 10)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {!loading && programs.length > 0 && (
            <CountBadge count={programs.length} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              البرامج المتأخرة
            </h3>
          </div>
          {!loading && programs.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {programs.length} برنامج
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[360px]">
          {loading && <LoadingSkeleton />}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchOverdue}
                className="mt-2 text-xs"
              >
                إعادة المحاولة
              </Button>
            </div>
          )}

          {!loading && !error && programs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                لا توجد برامج متأخرة
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                جميع البرامج تسير وفق الجدول الزمني
              </p>
            </div>
          )}

          {!loading && !error && programs.length > 0 && (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 p-3">
                {displayPrograms.map(program => (
                  <ProgramItem key={program.id} program={program} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        {!loading && programs.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowAll}
              className="w-full text-xs text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-2"
            >
              <List className="h-3.5 w-3.5" />
              عرض الكل في البرامج
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
