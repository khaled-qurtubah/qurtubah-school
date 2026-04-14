'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTHS } from '@/lib/constants'
import { getProgressColor } from '@/lib/constants'
import type { Program, Department, Employee } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, CheckCircle2, Clock, CircleDot, BarChart3, TrendingUp, Plus, Loader2, BarChart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface MonthStats {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  cancelled: number
  avgProgress: number
}

function getPerformanceBorderColor(avgProgress: number): string {
  if (avgProgress >= 80) return 'border-emerald-300 dark:border-emerald-600'
  if (avgProgress >= 50) return 'border-blue-300 dark:border-blue-600'
  if (avgProgress >= 25) return 'border-yellow-300 dark:border-yellow-600'
  return 'border-red-300 dark:border-red-600'
}

function getPerformanceGlow(avgProgress: number): string {
  if (avgProgress >= 80) return 'shadow-emerald-100/50 dark:shadow-emerald-950/20'
  if (avgProgress >= 50) return 'shadow-blue-100/50 dark:shadow-blue-950/20'
  if (avgProgress >= 25) return 'shadow-yellow-100/50 dark:shadow-yellow-950/20'
  return 'shadow-red-100/50 dark:shadow-red-950/20'
}

function getPerformanceBg(avgProgress: number): string {
  if (avgProgress >= 80) return 'bg-emerald-50/60 dark:bg-emerald-950/10'
  if (avgProgress >= 50) return 'bg-blue-50/60 dark:bg-blue-950/10'
  if (avgProgress >= 25) return 'bg-yellow-50/60 dark:bg-yellow-950/10'
  return 'bg-red-50/60 dark:bg-red-950/10'
}

interface QuickAddForm {
  name: string
  departmentId: string
  employeeId: string
}

export default function CalendarTab() {
  const { filters, setFilter, lastUpdated, triggerUpdate } = useAppStore()
  const [programs, setPrograms] = useState<Program[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Quick Add dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddMonth, setQuickAddMonth] = useState<number>(1)
  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>({
    name: '',
    departmentId: '',
    employeeId: '',
  })
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year: String(filters.year) })
      const res = await fetch(`/api/programs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setPrograms(json.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch programs:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.year, lastUpdated])

  useEffect(() => {
    fetchPrograms()
    // Also fetch departments and employees for the quick add dialog
    async function fetchRefData() {
      try {
        const [deptsRes, empsRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/employees'),
        ])
        if (deptsRes.ok) {
          const data = await deptsRes.json()
          setDepartments(data.data || [])
        }
        if (empsRes.ok) {
          const data = await empsRes.json()
          setEmployees(data.data || [])
        }
      } catch {
        // silent
      }
    }
    fetchRefData()
  }, [filters.year, lastUpdated, fetchPrograms])

  const monthStats: MonthStats[] = MONTHS.map((_, i) => {
    const monthNum = i + 1
    const monthPrograms = programs.filter((p) => p.month === monthNum)
    const total = monthPrograms.length
    const completed = monthPrograms.filter((p) => p.status === 'مكتملة').length
    const inProgress = monthPrograms.filter((p) => p.status === 'قيد التنفيذ').length
    const notStarted = monthPrograms.filter((p) => p.status === 'لم تبدأ').length
    const cancelled = monthPrograms.filter((p) => p.status === 'ملغاة').length
    const avgProgress = total > 0 ? Math.round(monthPrograms.reduce((sum, p) => sum + p.progress, 0) / total) : 0
    return { total, completed, inProgress, notStarted, cancelled, avgProgress }
  })

  // Yearly summary
  const yearTotal = programs.length
  const yearCompleted = programs.filter(p => p.status === 'مكتملة').length
  const yearInProgress = programs.filter(p => p.status === 'قيد التنفيذ').length
  const yearAvgProgress = yearTotal > 0 ? Math.round(programs.reduce((s, p) => s + p.progress, 0) / yearTotal) : 0
  const activeMonths = monthStats.filter(m => m.total > 0).length

  const isCurrentMonth = (monthIndex: number) => {
    const now = new Date()
    return filters.year === now.getFullYear() && monthIndex + 1 === now.getMonth() + 1
  }

  const isSelectedMonth = (monthIndex: number) => {
    return filters.month === monthIndex + 1
  }

  const handleCardClick = (monthIndex: number) => {
    const monthNum = monthIndex + 1
    // If the month is empty (0 programs), open quick add dialog
    if (monthStats[monthIndex].total === 0) {
      setQuickAddMonth(monthNum)
      setQuickAddForm({ name: '', departmentId: '', employeeId: '' })
      setQuickAddOpen(true)
      return
    }
    setFilter('month', filters.month === monthNum ? 0 : monthNum)
  }

  const handleQuickAdd = async () => {
    if (!quickAddForm.name.trim()) {
      toast.error('يرجى إدخال اسم البرنامج')
      return
    }
    setQuickAddSaving(true)
    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAddForm.name.trim(),
          departmentId: quickAddForm.departmentId || null,
          employeeId: quickAddForm.employeeId || null,
          status: 'لم تبدأ',
          priority: 'متوسطة',
          progress: 0,
          year: filters.year,
          month: quickAddMonth,
        }),
      })
      if (res.ok) {
        toast.success('تم إضافة البرنامج بنجاح')
        setQuickAddOpen(false)
        triggerUpdate()
        fetchPrograms()
      } else {
        toast.error('فشل في إضافة البرنامج')
      }
    } catch {
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setQuickAddSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Yearly Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="animate-stagger-1 surface-card p-3.5 border-r-4 border-r-emerald-500">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي البرامج</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{yearTotal}</p>
            </div>
          </div>
        </div>
        <div className="animate-stagger-2 surface-card p-3.5 border-r-4 border-r-teal-500">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">نسبة الإنجاز</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                {yearTotal > 0 ? Math.round((yearCompleted / yearTotal) * 100) : 0}%
                <span className="text-xs font-normal text-gray-400 mr-1">({yearCompleted})</span>
              </p>
            </div>
          </div>
        </div>
        <div className="animate-stagger-3 surface-card p-3.5 border-r-4 border-r-amber-500">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">متوسط التقدم</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{yearAvgProgress}%</p>
            </div>
          </div>
        </div>
        <div className="animate-stagger-4 surface-card p-3.5 border-r-4 border-r-purple-500">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">أشهر نشطة</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{activeMonths}/12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Month Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {monthStats.map((stats, index) => {
          const hasPrograms = stats.total > 0
          const borderColor = hasPrograms ? getPerformanceBorderColor(stats.avgProgress) : 'border-gray-200 dark:border-gray-700/50'
          const glowClass = hasPrograms ? getPerformanceGlow(stats.avgProgress) : ''
          const bgClass = hasPrograms ? getPerformanceBg(stats.avgProgress) : ''
          const current = isCurrentMonth(index)
          const selected = isSelectedMonth(index)

          return (
            <Popover key={index}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => handleCardClick(index)}
                  className={`
                    text-right w-full rounded-xl border bg-card p-4 shadow-sm
                    transition-all duration-250 ease-out hover:shadow-lg hover:scale-[1.02]
                    active:scale-[0.99] cursor-pointer outline-none
                    focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2
                    hover:border-emerald-300/50 dark:hover:border-emerald-700/50
                    ${borderColor} ${glowClass} ${bgClass}
                    ${selected ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background shadow-emerald-200/50 dark:shadow-emerald-900/30' : ''}
                    ${current && !selected ? 'ring-2 ring-emerald-300 dark:ring-emerald-700 ring-offset-1 ring-offset-background' : ''}
                    ${!hasPrograms ? 'group' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-lg
                        ${current
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                          : hasPrograms ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        <CalendarDays className="size-3.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground leading-tight">{MONTHS[index]}</h3>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {stats.total} برنامج
                        </p>
                      </div>
                    </div>
                    {hasPrograms && (
                      <span className={`
                        text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums
                        ${stats.avgProgress >= 80
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : stats.avgProgress >= 50
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                            : stats.avgProgress >= 25
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }
                      `}>
                        {stats.avgProgress}%
                      </span>
                    )}
                  </div>

                  {/* Status badges */}
                  {hasPrograms ? (
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 h-5 border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-2.5" />
                        {stats.completed}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 h-5 border-blue-200 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                        <Clock className="size-2.5" />
                        {stats.inProgress}
                      </Badge>
                      {stats.notStarted > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 h-5 border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400">
                          <CircleDot className="size-2.5" />
                          {stats.notStarted}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-3 mb-1 gap-2">
                      <p className="text-[11px] text-muted-foreground/60">لا توجد برامج</p>
                      <Plus className="size-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}

                  {/* Progress bar */}
                  {hasPrograms && (
                    <div className="space-y-1">
                      <div className={`h-2 w-full rounded-full overflow-hidden ${stats.avgProgress === 0 ? 'progress-bar-empty' : 'bg-muted/80'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${stats.avgProgress > 0 ? 'progress-bar-gradient' : ''}`}
                          style={{ width: `${stats.avgProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Current month indicator */}
                  {current && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30">
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        الشهر الحالي
                      </span>
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              {hasPrograms && (
                <PopoverContent side="top" align="center" className="w-64 p-4" dir="rtl">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart className="size-4 text-emerald-500" />
                      <h4 className="text-sm font-bold text-foreground">إحصائيات {MONTHS[index]}</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">إجمالي البرامج</span>
                        <span className="font-bold text-foreground">{stats.total}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          مكتملة
                        </span>
                        <span className="font-bold">{stats.completed}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Clock className="size-3" />
                          قيد التنفيذ
                        </span>
                        <span className="font-bold">{stats.inProgress}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <CircleDot className="size-3" />
                          لم تبدأ
                        </span>
                        <span className="font-bold">{stats.notStarted}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">متوسط التقدم</span>
                        <span className={`font-bold ${
                          stats.avgProgress >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                            : stats.avgProgress >= 50 ? 'text-blue-600 dark:text-blue-400'
                              : stats.avgProgress >= 25 ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stats.avgProgress}%
                        </span>
                      </div>
                    </div>
                    {/* Mini bar chart */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium">توزيع الحالات</p>
                      <div className="flex items-end gap-1 h-12">
                        {stats.total > 0 && (
                          <>
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                              <div
                                className="w-full rounded-sm bg-emerald-500 transition-all duration-300"
                                style={{ height: `${Math.max((stats.completed / stats.total) * 100, 2)}%` }}
                                title={`مكتملة: ${stats.completed}`}
                              />
                              <span className="text-[8px] text-muted-foreground">{stats.completed}</span>
                            </div>
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                              <div
                                className="w-full rounded-sm bg-blue-500 transition-all duration-300"
                                style={{ height: `${Math.max((stats.inProgress / stats.total) * 100, 2)}%` }}
                                title={`قيد التنفيذ: ${stats.inProgress}`}
                              />
                              <span className="text-[8px] text-muted-foreground">{stats.inProgress}</span>
                            </div>
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                              <div
                                className="w-full rounded-sm bg-gray-400 dark:bg-gray-600 transition-all duration-300"
                                style={{ height: `${Math.max((stats.notStarted / stats.total) * 100, 2)}%` }}
                                title={`لم تبدأ: ${stats.notStarted}`}
                              />
                              <span className="text-[8px] text-muted-foreground">{stats.notStarted}</span>
                            </div>
                            {stats.cancelled > 0 && (
                              <div className="flex-1 flex flex-col items-center gap-0.5">
                                <div
                                  className="w-full rounded-sm bg-red-400 dark:bg-red-600 transition-all duration-300"
                                  style={{ height: `${Math.max((stats.cancelled / stats.total) * 100, 2)}%` }}
                                  title={`ملغاة: ${stats.cancelled}`}
                                />
                                <span className="text-[8px] text-muted-foreground">{stats.cancelled}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" /> مكتملة</span>
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-blue-500" /> جارية</span>
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-gray-400" /> جديدة</span>
                        {stats.cancelled > 0 && (
                          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-red-400" /> ملغاة</span>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              )}
            </Popover>
          )
        })}
      </div>

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <Plus className="size-4" />
              </div>
              إضافة برنامج سريع
            </DialogTitle>
            <DialogDescription>
              إضافة برنامج جديد لشهر {MONTHS[quickAddMonth - 1]} {filters.year}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quick-name">اسم البرنامج *</Label>
              <Input
                id="quick-name"
                placeholder="مثال: ورشة عمل تربوية"
                value={quickAddForm.name}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd() }}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select
                  value={quickAddForm.departmentId}
                  onValueChange={(v) => setQuickAddForm({ ...quickAddForm, departmentId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: d.color || '#94a3b8' }} />
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المسؤول</Label>
                <Select
                  value={quickAddForm.employeeId}
                  onValueChange={(v) => setQuickAddForm({ ...quickAddForm, employeeId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر المسؤول" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مسؤول</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddOpen(false)} disabled={quickAddSaving}>
              إلغاء
            </Button>
            <Button
              onClick={handleQuickAdd}
              disabled={quickAddSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {quickAddSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
