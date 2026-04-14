'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Filter, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  STATUS_COLORS,
  PRIORITY_COLORS,
  MONTHS,
  STATUS_LIST,
  getProgressColor,
} from '@/lib/constants'
import { useAppStore } from '@/lib/store'
import type { Program, Department } from '@/lib/types'

interface TimelineFilters {
  year: number
  month: string | null
  departmentId: string | null
  status: string | null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .trim()
}

function groupByMonth(programs: Program[]): Record<string, Program[]> {
  const grouped: Record<string, Program[]> = {}
  for (const p of programs) {
    const key = `${p.year}-${p.month}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  }
  // Sort keys descending (most recent first)
  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
  )
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTHS[parseInt(month) - 1]} ${year}`
}

function getMonthSummary(programs: Program[]): string {
  const completed = programs.filter(p => p.status === 'مكتملة').length
  const inProgress = programs.filter(p => p.status === 'قيد التنفيذ').length
  const notStarted = programs.filter(p => p.status === 'لم تبدأ').length
  const cancelled = programs.filter(p => p.status === 'ملغاة').length

  const parts: string[] = []
  if (completed > 0) parts.push(`${completed} مكتملة`)
  if (inProgress > 0) parts.push(`${inProgress} قيد التنفيذ`)
  if (notStarted > 0) parts.push(`${notStarted} لم تبدأ`)
  if (cancelled > 0) parts.push(`${cancelled} ملغاة`)

  return parts.length > 0 ? parts.join('، ') : 'لا توجد برامج'
}

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
}

export default function TimelineTab() {
  const { filters: globalFilters, lastUpdated } = useAppStore()
  const [programs, setPrograms] = useState<Program[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [localFilters, setLocalFilters] = useState<TimelineFilters>({
    year: globalFilters.year,
    month: null,
    departmentId: null,
    status: null,
  })

  useEffect(() => {
    setLocalFilters((prev) => ({ ...prev, year: globalFilters.year }))
  }, [globalFilters.year])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('year', String(localFilters.year))
        if (localFilters.month) params.set('month', localFilters.month)
        if (localFilters.departmentId) params.set('departmentId', localFilters.departmentId)

        const [programsRes, deptsRes] = await Promise.all([
          fetch(`/api/programs?${params.toString()}`),
          fetch('/api/departments'),
        ])

        if (programsRes.ok) {
          const data = await programsRes.json()
          setPrograms(Array.isArray(data) ? data : data.data || data.programs || [])
        }
        if (deptsRes.ok) {
          const data = await deptsRes.json()
          setDepartments(Array.isArray(data) ? data : data.data || [])
        }
      } catch {
        setPrograms([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [localFilters.year, localFilters.month, localFilters.departmentId, lastUpdated])

  const filteredPrograms = useMemo(() => {
    let result = programs
    if (localFilters.status) {
      result = result.filter((p) => p.status === localFilters.status)
    }
    return result
  }, [programs, localFilters.status])

  const grouped = useMemo(() => groupByMonth(filteredPrograms), [filteredPrograms])

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return [current, current - 1, current + 1]
  }, [])

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      if (next.has(monthKey)) {
        next.delete(monthKey)
      } else {
        next.add(monthKey)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-28 shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="size-4" />
          <span>تصفية:</span>
        </div>

        <Select
          value={String(localFilters.year)}
          onValueChange={(v) =>
            setLocalFilters((prev) => ({ ...prev, year: parseInt(v) }))
          }
        >
          <SelectTrigger size="sm" className="w-32">
            <Calendar className="ml-1 size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={localFilters.month || 'all'}
          onValueChange={(v) =>
            setLocalFilters((prev) => ({
              ...prev,
              month: v === 'all' ? null : v,
            }))
          }
        >
          <SelectTrigger size="sm" className="w-36">
            <Clock className="ml-1 size-3.5" />
            <SelectValue placeholder="الشهر" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأشهر</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={localFilters.departmentId || 'all'}
          onValueChange={(v) =>
            setLocalFilters((prev) => ({
              ...prev,
              departmentId: v === 'all' ? null : v,
            }))
          }
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={localFilters.status || 'all'}
          onValueChange={(v) =>
            setLocalFilters((prev) => ({
              ...prev,
              status: v === 'all' ? null : v,
            }))
          }
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {STATUS_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium">
          {filteredPrograms.length} برنامج
        </span>
        <span>•</span>
        <span>{Object.keys(grouped).length} أشهر</span>
      </div>

      {/* Timeline */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <AlertCircle className="size-12 opacity-30" />
          <p className="text-lg font-medium">لا توجد برامج للعرض</p>
          <p className="text-sm">جرب تغيير معايير البحث أو الفلاتر</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="relative space-y-8 pl-8 md:pl-12">
            {/* Timeline line */}
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/80 via-emerald-300/40 to-transparent" />

            <AnimatePresence mode="popLayout">
              {Object.entries(grouped).map(([monthKey, monthPrograms]) => {
                const isCollapsed = collapsedMonths.has(monthKey)

                return (
                  <motion.div
                    key={monthKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    {/* Month dot */}
                    <div className="absolute right-[-25px] top-1 z-10 flex size-5 items-center justify-center rounded-full border-2 border-emerald-500 bg-background">
                      <div className="size-2 rounded-full bg-emerald-500" />
                    </div>

                    {/* Month label with toggle */}
                    <button
                      onClick={() => toggleMonth(monthKey)}
                      className="mb-3 flex items-center gap-3 w-full text-right group cursor-pointer"
                    >
                      <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {formatMonthLabel(monthKey)}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {monthPrograms.length} برنامج
                      </Badge>
                      <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
                        — {getMonthSummary(monthPrograms)}
                      </span>
                      <div className="mr-auto flex items-center">
                        {isCollapsed ? (
                          <ChevronDown className="size-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        ) : (
                          <ChevronUp className="size-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        )}
                      </div>
                    </button>

                    {/* Programs cards - collapsible */}
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                          animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                          exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="space-y-3 pr-4"
                        >
                          {monthPrograms.map((program, idx) => {
                            const statusStyle = STATUS_COLORS[program.status] || STATUS_COLORS['لم تبدأ']
                            const priorityStyle = PRIORITY_COLORS[program.priority] || PRIORITY_COLORS['متوسطة']
                            const progressBg = getProgressColor(program.progress)

                            return (
                              <motion.div
                                key={program.id}
                                custom={idx}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                layout
                              >
                                <Card className="overflow-hidden py-0 transition-shadow hover:shadow-md">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col gap-3">
                                      {/* Top row: name + badges */}
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <h4 className="text-sm font-bold leading-tight text-foreground">
                                          {program.name}
                                        </h4>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                                          >
                                            <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                                            {program.status}
                                          </span>
                                          <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}
                                          >
                                            <span className={`size-1.5 rounded-full ${priorityStyle.dot}`} />
                                            {program.priority}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Progress bar */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">التقدم</span>
                                          <span className="font-medium text-foreground">
                                            {program.progress}%
                                          </span>
                                        </div>
                                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                                          <motion.div
                                            className={`h-full rounded-full ${progressBg}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${program.progress}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                                          />
                                        </div>
                                      </div>

                                      {/* Bottom row: department + employee */}
                                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        {program.department && (
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className="size-2.5 rounded-full"
                                              style={{ backgroundColor: program.department.color }}
                                            />
                                            <span>{program.department.name}</span>
                                          </div>
                                        )}
                                        {program.employee && (
                                          <div className="flex items-center gap-1.5">
                                            <div
                                              className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                              style={{
                                                backgroundColor: program.department?.color || '#6b7280',
                                              }}
                                            >
                                              {getInitials(program.employee.name)}
                                            </div>
                                            <span>{program.employee.name}</span>
                                          </div>
                                        )}
                                        {program.position && (
                                          <span className="text-muted-foreground/70">
                                            {program.position}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Collapsed summary */}
                    {isCollapsed && (
                      <div className="pr-4">
                        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground text-center">
                            {getMonthSummary(monthPrograms)}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
