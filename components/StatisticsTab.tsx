'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTHS, SCHOOL_COLORS } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
  Printer,
  Download,
  ArrowUp,
  ArrowDown,
  GitCompare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface StatsData {
  summary: {
    totalPrograms: number
    completedPrograms: number
    completedPercentage: number
    inProgressPrograms: number
    averageProgress: number
  }
  byDepartment: Array<{
    name: string
    count: number
    color: string
  }>
  byStatus: Array<{
    name: string
    count: number
    color: string
  }>
  byMonth: Array<{
    month: string
    count: number
  }>
  employeePerformance: Array<{
    name: string
    progress: number
    programs: number
  }>
}

const STATUS_PIE_COLORS: Record<string, string> = {
  'لم تبدأ': '#9ca3af',
  'قيد التنفيذ': '#3b82f6',
  'مكتملة': '#10b981',
  'ملغاة': '#ef4444',
}

const SUMMARY_CARDS = [
  {
    key: 'totalPrograms' as const,
    title: 'إجمالي البرامج',
    icon: BarChart3,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    trendColor: 'bg-emerald-500',
    staggerClass: 'animate-stagger-1',
  },
  {
    key: 'completedPrograms' as const,
    title: 'البرامج المكتملة',
    icon: CheckCircle2,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    extra: 'percentage',
    trendColor: 'bg-blue-500',
    staggerClass: 'animate-stagger-2',
  },
  {
    key: 'inProgressPrograms' as const,
    title: 'برامج قيد التنفيذ',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    trendColor: 'bg-amber-500',
    staggerClass: 'animate-stagger-3',
  },
  {
    key: 'averageProgress' as const,
    title: 'متوسط التقدم',
    icon: TrendingUp,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    suffix: '%',
    trendColor: 'bg-purple-500',
    staggerClass: 'animate-stagger-4',
  },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip px-3.5 py-2.5 text-sm" dir="rtl">
      {label && <p className="font-semibold text-gray-900 dark:text-white mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200" style={{ color: entry.color }}>
          <span className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string } | { payload: { name: string; fill: string } } | null> }) => {
  if (!payload) return null
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs" dir="rtl">
      {payload.map((entry, i) => {
        const name = 'value' in entry ? entry.value : entry.payload?.name || ''
        const color = 'color' in entry ? entry.color : entry.payload?.fill || '#666'
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-600 dark:text-gray-400">{name}</span>
          </div>
        )
      })}
    </div>
  )
}

// Helper to compute percentage change between two values
function PercentChange({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0) {
    if (current > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><ArrowUp className="size-3" />جديد</span>
    return null
  }
  const change = ((current - previous) / previous) * 100
  const isPositive = change >= 0
  if (Math.abs(change) < 0.5) return null
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isPositive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(Math.round(change))}%{suffix && ` ${suffix}`}
    </span>
  )
}

export default function StatisticsTab() {
  const { filters, lastUpdated } = useAppStore()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [compareStats, setCompareStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Year comparison toggle (Feature 4)
  const [compareYear, setCompareYear] = useState<number | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('year', String(filters.year))
        if (compareYear) params.set('compareYear', String(compareYear))

        const res = await fetch(`/api/stats?${params}`)
        if (res.ok) {
          const json = await res.json()
          const data = json.data || json
          const cmpData = json.compareData || null

          setStats({
            summary: {
              totalPrograms: data.total || 0,
              completedPrograms: data.completed || 0,
              completedPercentage: data.total ? Math.round(((data.completed || 0) / data.total) * 100) : 0,
              inProgressPrograms: data.inProgress || 0,
              averageProgress: data.avgProgress || 0,
            },
            byDepartment: (data.programsByDepartment || []).map((d: { name: string; color: string; count: number }) => ({
              name: d.name, count: d.count, color: d.color,
            })),
            byStatus: Object.entries(data.programsByStatus || {}).map(([name, count]) => ({
              name, count: count as number, color: STATUS_PIE_COLORS[name] || '#666',
            })),
            byMonth: (data.programsByMonth || []).map((m: { month: number; name: string; total: number }) => ({
              month: m.name || MONTHS[m.month - 1] || '', count: m.total,
            })),
            employeePerformance: (data.employeePerformance || []).map((e: { name: string; avgProgress: number; totalPrograms: number }) => ({
              name: e.name, progress: e.avgProgress, programs: e.totalPrograms,
            })),
          })

          if (cmpData) {
            setCompareStats({
              summary: {
                totalPrograms: cmpData.total || 0,
                completedPrograms: cmpData.completed || 0,
                completedPercentage: cmpData.total ? Math.round(((cmpData.completed || 0) / cmpData.total) * 100) : 0,
                inProgressPrograms: cmpData.inProgress || 0,
                averageProgress: cmpData.avgProgress || 0,
              },
              byDepartment: [],
              byStatus: [],
              byMonth: [],
              employeePerformance: [],
            })
          } else {
            setCompareStats(null)
          }
        } else {
          toast.error('فشل في تحميل الإحصائيات')
        }
      } catch {
        toast.error('حدث خطأ أثناء تحميل الإحصائيات')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [lastUpdated, filters.year, compareYear])

  return (
    <div className="space-y-6">
      {/* Header + Compare Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">الإحصائيات والتقارير</h2>
        </div>
        {/* Year-over-Year Comparison Toggle (Feature 4) */}
        <div className="flex items-center gap-2">
          <GitCompare className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">مقارنة مع:</span>
          <button
            onClick={() => setCompareYear(null)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              compareYear === null
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            بدون مقارنة
          </button>
          <button
            onClick={() => setCompareYear(filters.year - 1)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              compareYear === filters.year - 1
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {filters.year - 1}
          </button>
          {filters.year - 2 >= 2020 && (
            <button
              onClick={() => setCompareYear(filters.year - 2)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                compareYear === filters.year - 2
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {filters.year - 2}
            </button>
          )}
        </div>
      </div>

      {/* بطاقات الملخص */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-card p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon
            let value = stats.summary[card.key]
            let extra = ''
            if (card.extra === 'percentage') {
              extra = ` (${stats.summary.completedPercentage}%)`
            }
            return (
              <div key={card.key} className={`${card.staggerClass} surface-card card-lift p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`size-1.5 rounded-full ${card.trendColor} animate-pulse`} />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {value}
                  </span>
                  {card.suffix && (
                    <span className="text-sm text-gray-400">{card.suffix}</span>
                  )}
                  {extra && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{extra}</span>
                  )}
                </div>
                {/* Year-over-Year comparison inline (Feature 4) */}
                {compareStats && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <PercentChange
                      current={value as number}
                      previous={compareStats.summary[card.key] as number}
                      suffix={card.suffix}
                    />
                    {compareStats && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {compareYear}: {compareStats.summary[card.key]}{card.suffix || ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* الرسوم البيانية */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-card p-6">
              <Skeleton className="h-5 w-36 mb-4" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* رسم بياني: البرامج حسب القسم */}
          <div className="surface-card card-lift p-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                البرامج حسب القسم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byDepartment}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={75}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="عدد البرامج" radius={[0, 6, 6, 0]}>
                      {stats.byDepartment.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </div>

          {/* رسم بياني: البرامج حسب الحالة */}
          <div className="surface-card card-lift p-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                البرامج حسب الحالة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byStatus}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={true}
                    >
                      {stats.byStatus.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={STATUS_PIE_COLORS[entry.name] || entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </div>

          {/* رسم بياني: الاتجاه الشهري (Sparkline Area Chart) */}
          <div className="surface-card card-lift p-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                الاتجاه الشهري للبرامج
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.byMonth}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb30" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="عدد البرامج"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#emeraldGradient)"
                      dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </div>

          {/* رسم بياني: أداء الموظفين */}
          <div className="surface-card card-lift p-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                مقارنة أداء الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.employeePerformance}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={75}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="chart-tooltip px-3.5 py-2.5 text-sm" dir="rtl">
                            {label && <p className="font-semibold text-gray-900 dark:text-white mb-1.5">{label}</p>}
                            {payload.map((entry, i) => (
                              <p key={i} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                                <span className="size-1.5 rounded-full flex-shrink-0 bg-emerald-500" />
                                {entry.name === 'progress'
                                  ? `التقدم: ${entry.value}%`
                                  : `${entry.name}: ${entry.value}`}
                              </p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="progress"
                      name="التقدم"
                      radius={[0, 6, 6, 0]}
                    >
                      {stats.employeePerformance.map((entry, index) => {
                        let color = '#ef4444'
                        if (entry.progress >= 80) color = '#10b981'
                        else if (entry.progress >= 50) color = '#3b82f6'
                        else if (entry.progress >= 25) color = '#f59e0b'
                        return <Cell key={index} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </div>
        </div>
      ) : null}

      {/* Exportable Summary Card */}
      {stats && !loading && (
        <div className="surface-card gradient-border" id="stats-summary-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                ملخص الأداء السنوي
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => {
                    const el = document.getElementById('stats-summary-card')
                    if (el) {
                      const w = window.open('', '_blank')
                      if (w) {
                        w.document.write(`
                          <html dir="rtl" lang="ar">
                          <head>
                            <title>ملخص الأداء - مدارس قرطبة</title>
                            <style>
                              body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #1a1a1a; }
                              h1 { font-size: 20px; margin-bottom: 8px; }
                              .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                              th, td { padding: 8px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
                              th { background: #f0fdf4; font-weight: 600; }
                              .footer { margin-top: 24px; font-size: 11px; color: #999; }
                            </style>
                          </head>
                          <body>
                            <h1>📊 ملخص الأداء السنوي</h1>
                            <p class="subtitle">مدارس قرطبة الأهلية - ${filters.year}</p>
                            <table>
                              <thead><tr><th>المؤشر</th><th>القيمة</th></tr></thead>
                              <tbody>
                                <tr><td>إجمالي البرامج</td><td>${stats.summary.totalPrograms}</td></tr>
                                <tr><td>البرامج المكتملة</td><td>${stats.summary.completedPrograms} (${stats.summary.completedPercentage}%)</td></tr>
                                <tr><td>برامج قيد التنفيذ</td><td>${stats.summary.inProgressPrograms}</td></tr>
                                <tr><td>متوسط التقدم</td><td>${stats.summary.averageProgress}%</td></tr>
                                ${stats.byDepartment.map((d: { name: string; count: number }) => `<tr><td>القسم: ${d.name}</td><td>${d.count} برنامج</td></tr>`).join('')}
                              </tbody>
                            </table>
                            ${compareStats ? `<p style="margin-top:16px;font-size:12px;color:#666;">مقارنة مع ${compareYear}: ${compareStats.summary.totalPrograms} برنامج (${compareStats.summary.completedPercentage}% إنجاز)</p>` : ''}
                            <p class="footer">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
                          </body></html>
                        `)
                        w.document.close()
                        w.print()
                      }
                    }
                  }}
                >
                  <Printer className="size-3" />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي البرامج', value: stats.summary.totalPrograms, color: 'text-emerald-700 dark:text-emerald-400', compareValue: compareStats?.summary.totalPrograms },
                { label: 'البرامج المكتملة', value: `${stats.summary.completedPrograms} (${stats.summary.completedPercentage}%)`, color: 'text-teal-700 dark:text-teal-400', compareValue: compareStats?.summary.completedPrograms },
                { label: 'برامج قيد التنفيذ', value: stats.summary.inProgressPrograms, color: 'text-amber-700 dark:text-amber-400', compareValue: compareStats?.summary.inProgressPrograms },
                { label: 'متوسط التقدم', value: `${stats.summary.averageProgress}%`, color: 'text-emerald-700 dark:text-emerald-400', compareValue: compareStats?.summary.averageProgress },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-lg bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10">
                  <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{item.label}</p>
                  {compareStats && item.compareValue !== undefined && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ({compareYear}: {item.compareValue})
                    </p>
                  )}
                </div>
              ))}
            </div>
            {stats.byDepartment.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">توزيع البرامج على الأقسام:</p>
                <div className="flex flex-wrap gap-3">
                  {stats.byDepartment.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-medium">{d.name}:</span>
                      <span className="text-muted-foreground">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </div>
      )}
    </div>
  )
}
