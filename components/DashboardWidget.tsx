'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Settings2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { STATUS_COLORS, MONTHS } from '@/lib/constants'
import type { Program, Employee } from '@/lib/types'
import { toast } from 'sonner'
import { create } from 'zustand'

// Zustand store for dashboard widget visibility
interface DashboardWidgetState {
  visible: boolean
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

export const useDashboardWidgetStore = create<DashboardWidgetState>((set) => ({
  visible: true,
  collapsed: false,
  toggle: () => set((s) => ({ visible: !s.visible })),
  setCollapsed: (v) => set({ collapsed: v }),
}))

// Mini Progress Ring Component
function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#10b981',
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative progress-ring-gradient" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`progressGradient-${size}-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progress >= 50 ? `url(#progressGradient-${size}-${color})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground animate-kpi-reveal">{progress}%</span>
      </div>
    </div>
  )
}

// Activity type icons and colors
const ACTIVITY_ICONS: Record<string, { icon: typeof Activity; color: string }> = {
  create: { icon: Activity, color: 'text-emerald-500' },
  update: { icon: RefreshCw, color: 'text-blue-500' },
  delete: { icon: AlertTriangle, color: 'text-red-500' },
  status_change: { icon: Clock, color: 'text-amber-500' },
  favorite_toggle: { icon: CheckCircle2, color: 'text-pink-500' },
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`
  return new Date(dateStr).toLocaleDateString('ar-SA')
}

// Section configuration for customization (Feature 3)
const DASHBOARD_SECTIONS = [
  { key: 'kpis' as const, label: 'المؤشرات الرئيسية', icon: TrendingUp },
  { key: 'needsAttention' as const, label: 'تحتاج متابعة', icon: AlertTriangle },
  { key: 'recentActivity' as const, label: 'آخر الأنشطة', icon: Activity },
]

export default function DashboardWidget() {
  const { visible, collapsed, toggle, setCollapsed } = useDashboardWidgetStore()
  const { lastUpdated, dashboardSections, toggleDashboardSection } = useAppStore()
  const [programs, setPrograms] = useState<Program[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activities, setActivities] = useState<
    Array<{
      id: string
      type: string
      programName: string
      details: string
      timestamp: string
    }>
  >([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [progRes, empRes, actRes] = await Promise.all([
        fetch('/api/programs?limit=9999'),
        fetch('/api/employees'),
        fetch('/api/activity?limit=5'),
      ])

      if (progRes.ok) {
        const json = await progRes.json()
        setPrograms(json.data || [])
      }
      if (empRes.ok) {
        const json = await empRes.json()
        setEmployees(json.data || [])
      }
      if (actRes.ok) {
        const json = await actRes.json()
        setActivities(json.data || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData, lastUpdated])

  // Compute KPIs
  const kpis = useMemo(() => {
    const total = programs.length
    const completed = programs.filter((p) => p.status === 'مكتملة').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const avgProgress =
      total > 0 ? Math.round(programs.reduce((sum, p) => sum + p.progress, 0) / total) : 0
    const activeEmployees = new Set(
      programs.filter((p) => p.status === 'قيد التنفيذ' && p.employeeId).map((p) => p.employeeId)
    ).size
    return { total, completed, completionRate, avgProgress, activeEmployees }
  }, [programs])

  // Programs needing attention (overdue or behind schedule)
  const needsAttention = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    return programs
      .filter((p) => {
        if (p.status === 'قيد التنفيذ' && p.progress < 30 && p.month < currentMonth) return true
        if (p.status === 'لم تبدأ' && p.month < currentMonth) return true
        return false
      })
      .slice(0, 5)
  }, [programs])

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Card className="overflow-hidden border-emerald-200/50 dark:border-emerald-800/30 bg-card">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-sm font-bold">لوحة المؤشرات الرئيسية</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                {/* Customize Button (Feature 3) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7" title="تخصيص">
                      <Settings2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" side="bottom" align="start">
                    <p className="text-xs font-semibold text-foreground mb-3">تخصيص الأقسام</p>
                    <div className="space-y-2.5">
                      {DASHBOARD_SECTIONS.map((section) => {
                        const Icon = section.icon
                        const isChecked = dashboardSections[section.key]
                        return (
                          <label
                            key={section.key}
                            className="flex items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`size-3.5 ${isChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                              <span className="text-xs font-medium text-foreground">{section.label}</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isChecked}
                              onClick={() => toggleDashboardSection(section.key)}
                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                isChecked ? 'bg-emerald-600' : 'bg-muted'
                              }`}
                            >
                              <span
                                className={`pointer-events-none block size-3 rounded-full bg-white shadow-lg transition-transform ${
                                  isChecked ? '-translate-x-3.5' : '-translate-x-0.5'
                                }`}
                              />
                            </button>
                          </label>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? (
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={toggle}
                  title="إخفاء اللوحة"
                >
                  <EyeOff className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!collapsed && (
            <CardContent className="px-4 pb-4 pt-0">
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {/* KPI Cards Row */}
                  <AnimatePresence>
                    {dashboardSections.kpis && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                          {/* Completion Rate with Progress Ring */}
                          <div className="col-span-2 lg:col-span-1 flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30">
                            <ProgressRing
                              progress={kpis.completionRate}
                              size={64}
                              strokeWidth={5}
                              color={kpis.completionRate >= 50 ? '#10b981' : '#f59e0b'}
                            />
                            <div className="animate-kpi-reveal" style={{ animationDelay: '0.1s' }}>
                              <p className="text-xs text-muted-foreground">معدل الإنجاز</p>
                              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                {kpis.completionRate}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {kpis.completed} من {kpis.total}
                              </p>
                            </div>
                          </div>

                          {/* Average Progress */}
                          <div className="p-3 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border border-teal-100 dark:border-teal-900/30">
                            <div className="animate-kpi-reveal" style={{ animationDelay: '0.2s' }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <TrendingUp className="size-3.5 text-teal-600 dark:text-teal-400" />
                                <span className="text-[11px] text-muted-foreground">متوسط التقدم</span>
                              </div>
                              <p className="text-xl font-bold text-teal-700 dark:text-teal-400">
                                {kpis.avgProgress}%
                              </p>
                              <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${kpis.avgProgress === 0 ? 'progress-bar-empty' : 'bg-muted'}`}>
                                <div
                                  className="h-full rounded-full bg-teal-500 transition-all duration-700"
                                  style={{ width: `${kpis.avgProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Active Employees */}
                          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100 dark:border-amber-900/30">
                            <div className="animate-kpi-reveal" style={{ animationDelay: '0.3s' }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Users className="size-3.5 text-amber-600 dark:text-amber-400" />
                                <span className="text-[11px] text-muted-foreground">الموظفون النشطون</span>
                              </div>
                              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                                {kpis.activeEmployees}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                من أصل {employees.length} موظف
                              </p>
                            </div>
                          </div>

                          {/* Total Programs */}
                          <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-100 dark:border-emerald-900/30">
                            <div className="animate-kpi-reveal" style={{ animationDelay: '0.4s' }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[11px] text-muted-foreground">إجمالي البرامج</span>
                              </div>
                              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                                {kpis.total}
                              </p>
                              <div className="flex gap-2 mt-1 text-[10px]">
                                <span className="text-emerald-600 dark:text-emerald-400">{kpis.completed} مكتملة</span>
                                <span className="text-blue-600 dark:text-blue-400">
                                  {programs.filter((p) => p.status === 'قيد التنفيذ').length} جارية
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Needs Attention */}
                          <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border border-red-100 dark:border-red-900/30">
                            <div className="animate-kpi-reveal" style={{ animationDelay: '0.5s' }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <AlertTriangle className="size-3.5 text-red-500" />
                                <span className="text-[11px] text-muted-foreground">تحتاج متابعة</span>
                              </div>
                              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                {needsAttention.length}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                برنامج متأخر أو متوقف
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bottom Row: Needs Attention + Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Needs Attention */}
                    <AnimatePresence>
                      {dashboardSections.needsAttention && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="size-3.5 text-red-500" />
                                <h4 className="text-xs font-semibold text-red-700 dark:text-red-400">
                                  تحتاج متابعة عاجلة
                                </h4>
                              </div>
                              <button
                                onClick={() => toggleDashboardSection('needsAttention')}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="طي القسم"
                              >
                                <ChevronUp className="size-3" />
                              </button>
                            </div>
                            {needsAttention.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground text-center py-3">
                                لا توجد برامج تحتاج متابعة حالياً ✨
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                                {needsAttention.map((p) => {
                                  const statusColor = STATUS_COLORS[p.status]
                                  return (
                                    <div
                                      key={p.id}
                                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-white/50 dark:bg-gray-900/50"
                                    >
                                      <p className="text-[11px] font-medium text-foreground truncate flex-1">
                                        {p.name}
                                      </p>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-muted-foreground">
                                          {MONTHS[p.month - 1]}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={`${statusColor?.bg} ${statusColor?.text} text-[9px] gap-0.5 h-4 border-0 px-1.5`}
                                        >
                                          <span className={`size-1 rounded-full ${statusColor?.dot}`} />
                                          {p.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Recent Activity */}
                    <AnimatePresence>
                      {dashboardSections.recentActivity && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10 p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <Activity className="size-3.5 text-emerald-500" />
                                <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  آخر الأنشطة
                                </h4>
                              </div>
                              <button
                                onClick={() => toggleDashboardSection('recentActivity')}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="طي القسم"
                              >
                                <ChevronUp className="size-3" />
                              </button>
                            </div>
                            {activities.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground text-center py-3">
                                لا توجد أنشطة حديثة
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                                {activities.map((act) => {
                                  const iconData = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.create
                                  const Icon = iconData.icon
                                  return (
                                    <div
                                      key={act.id}
                                      className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-white/50 dark:bg-gray-900/50"
                                    >
                                      <Icon className={`size-3 mt-0.5 shrink-0 ${iconData.color}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-foreground truncate">
                                          {act.programName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                          {act.details}
                                        </p>
                                      </div>
                                      <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">
                                        {relativeTime(act.timestamp)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Export a standalone button to re-show the widget when hidden
export function ShowDashboardWidgetButton() {
  const { visible, toggle } = useDashboardWidgetStore()
  if (visible) return null
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="gap-1.5 mb-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/20"
    >
      <Eye className="size-3.5" />
      إظهار لوحة المؤشرات
    </Button>
  )
}
