'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Building2,
  Users,
  ClipboardList,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Circle,
  LayoutGrid,
  Table as TableIcon,
  TrendingUp,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  STATUS_COLORS,
  MONTHS,
  getProgressColor,
} from '@/lib/constants'
import { useAppStore } from '@/lib/store'
import type { Department, Program } from '@/lib/types'

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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

interface DepartmentStats {
  department: Department
  avgProgress: number
  totalPrograms: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  cancelledCount: number
  completionRate: number
  programs: Program[]
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export default function DepartmentsTab() {
  const { lastUpdated } = useAppStore()
  const [departments, setDepartments] = useState<Department[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sortBy, setSortBy] = useState<'performance' | 'order'>('performance')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [deptRes, progRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/programs'),
        ])

        let deptData: Department[] = []
        let progData: Program[] = []

        if (deptRes.ok) {
          const raw = await deptRes.json()
          deptData = Array.isArray(raw) ? raw : raw.data || []
        }
        if (progRes.ok) {
          const raw = await progRes.json()
          progData = Array.isArray(raw) ? raw : raw.data || []
        }

        setDepartments(deptData)
        setPrograms(progData)
      } catch {
        setDepartments([])
        setPrograms([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [lastUpdated])

  const deptStats = useMemo((): DepartmentStats[] => {
    return departments
      .map((dept) => {
        const deptPrograms = programs.filter((p) => p.departmentId === dept.id)
        const avgProgress =
          deptPrograms.length > 0
            ? Math.round(deptPrograms.reduce((sum, p) => sum + p.progress, 0) / deptPrograms.length)
            : 0

        const completionRate = deptPrograms.length > 0
          ? Math.round((deptPrograms.filter((p) => p.status === 'مكتملة').length / deptPrograms.length) * 100)
          : 0

        return {
          department: dept,
          avgProgress,
          totalPrograms: deptPrograms.length,
          completedCount: deptPrograms.filter((p) => p.status === 'مكتملة').length,
          inProgressCount: deptPrograms.filter((p) => p.status === 'قيد التنفيذ').length,
          notStartedCount: deptPrograms.filter((p) => p.status === 'لم تبدأ').length,
          cancelledCount: deptPrograms.filter((p) => p.status === 'ملغاة').length,
          completionRate,
          programs: deptPrograms,
        }
      })
      .sort((a, b) => {
        if (sortBy === 'performance') {
          return b.avgProgress - a.avgProgress || b.completionRate - a.completionRate
        }
        return a.department.order - b.department.order
      })
  }, [departments, programs])

  // Overall stats
  const overallStats = useMemo(() => {
    const totalPrograms = programs.length
    const avgProgress =
      totalPrograms > 0
        ? Math.round(programs.reduce((sum, p) => sum + p.progress, 0) / totalPrograms)
        : 0
    return {
      totalDepartments: departments.length,
      totalPrograms,
      avgProgress,
      completedCount: programs.filter((p) => p.status === 'مكتملة').length,
    }
  }, [departments, programs])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'الأقسام',
            value: overallStats.totalDepartments,
            icon: Building2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          },
          {
            label: 'إجمالي البرامج',
            value: overallStats.totalPrograms,
            icon: ClipboardList,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
          },
          {
            label: 'مكتملة',
            value: overallStats.completedCount,
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          },
          {
            label: 'متوسط التقدم',
            value: `${overallStats.avgProgress}%`,
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
          },
        ].map((stat) => (
          <Card key={stat.label} className="overflow-hidden py-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold leading-tight text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">الأقسام</h2>
        <div className="flex items-center gap-3">
          <Button
            variant={sortBy === 'performance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy(sortBy === 'performance' ? 'order' : 'performance')}
            className={`gap-1.5 text-xs h-8 ${sortBy === 'performance' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
          >
            <ArrowUpDown className="size-3" />
            {sortBy === 'performance' ? 'ترتيب بالأداء' : 'ترتيب افتراضي'}
          </Button>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => { if (v) setViewMode(v as 'grid' | 'table') }}
            className="border rounded-lg"
          >
            <ToggleGroupItem value="grid" className="size-8 p-0" aria-label="عرض بطاقات">
              <LayoutGrid className="size-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="size-8 p-0" aria-label="عرض جدول">
              <TableIcon className="size-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Departments */}
      {deptStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <AlertCircle className="size-12 opacity-30" />
          <p className="text-lg font-medium">لا توجد أقسام</p>
          <p className="text-sm">لم يتم إضافة أقسام بعد</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>القسم</TableHead>
                <TableHead className="text-center">الموظفين</TableHead>
                <TableHead className="text-center">البرامج</TableHead>
                <TableHead className="text-center min-w-[100px]">التقدم</TableHead>
                <TableHead className="text-center">مكتملة</TableHead>
                <TableHead className="text-center">قيد التنفيذ</TableHead>
                <TableHead className="text-center">لم تبدأ</TableHead>
                <TableHead className="text-center">ملغاة</TableHead>
                <TableHead className="text-center min-w-[90px]">نسبة الإنجاز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deptStats.map((dept, idx) => {
                const color = dept.department.color
                return (
                  <TableRow key={dept.department.id} className="row-accent-hover">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex size-7 items-center justify-center rounded-md text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {getInitials(dept.department.name)}
                        </div>
                        <span className="font-medium text-sm">{dept.department.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{dept.department._count?.employees || 0}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{dept.totalPrograms}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 h-1.5 rounded-full overflow-hidden min-w-[40px] ${dept.avgProgress === 0 ? 'progress-bar-empty' : 'bg-muted'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${dept.avgProgress > 0 ? 'progress-bar-gradient' : ''}`}
                            style={{ width: `${dept.avgProgress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold min-w-[28px] text-left" style={{ color }}>{dept.avgProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />{dept.completedCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                        <Clock className="size-3" />{dept.inProgressCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <Circle className="size-3" />{dept.notStartedCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                        {dept.cancelledCount > 0 && <span>✕</span>}{dept.cancelledCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[11px] font-bold ${
                        dept.completionRate >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : dept.completionRate >= 50 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                        : dept.completionRate >= 25 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800'
                      }`}>
                        {dept.completionRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Card Grid View */
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {deptStats.map((dept, idx) => {
              const isExpanded = expandedId === dept.department.id
              const progressBg = getProgressColor(dept.avgProgress)
              const color = dept.department.color

              return (
                <motion.div
                  key={dept.department.id}
                  custom={idx}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={(open) =>
                      setExpandedId(open ? dept.department.id : null)
                    }
                  >
                    <Card
                      className="overflow-hidden py-0 transition-shadow hover:shadow-md"
                      style={{ borderTopColor: color, borderTopWidth: '3px' }}
                    >
                      <CollapsibleTrigger className="w-full text-right">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex size-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                                  style={{ backgroundColor: color }}
                                >
                                  {getInitials(dept.department.name)}
                                </div>
                                <h3 className="text-sm font-bold text-foreground">
                                  {dept.department.name}
                                </h3>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="size-4 text-muted-foreground" />
                              </motion.div>
                            </div>

                            {/* Progress */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground">
                                  {dept.avgProgress}%
                                </span>
                                <span className="text-muted-foreground">متوسط التقدم</span>
                              </div>
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${dept.avgProgress}%` }}
                                  transition={{
                                    duration: 0.7,
                                    ease: 'easeOut',
                                    delay: idx * 0.06,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Stats row with performance metrics */}
                            <div className="flex items-center justify-around text-xs">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <Users className="size-3 text-muted-foreground" />
                                  <span className="font-bold text-foreground">
                                    {dept.department._count?.employees || 0}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">موظف</span>
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <ClipboardList className="size-3 text-muted-foreground" />
                                  <span className="font-bold text-foreground">
                                    {dept.totalPrograms}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">برنامج</span>
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="size-3 text-emerald-500" />
                                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                    {dept.completionRate}%
                                  </span>
                                </div>
                                <span className="text-muted-foreground">إنجاز</span>
                              </div>
                            </div>

                            {/* Status breakdown */}
                            <div className="flex items-center justify-around">
                              <div className="flex items-center gap-1 text-xs">
                                <CheckCircle2 className="size-3 text-emerald-500" />
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  {dept.completedCount}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <Clock className="size-3 text-blue-500" />
                                <span className="text-blue-700 dark:text-blue-400 font-medium">
                                  {dept.inProgressCount}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <Circle className="size-3 text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-400 font-medium">
                                  {dept.notStartedCount}
                                </span>
                              </div>
                              {dept.cancelledCount > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="size-3 text-red-500 flex items-center justify-center">
                                    ✕
                                  </span>
                                  <span className="text-red-700 dark:text-red-400 font-medium">
                                    {dept.cancelledCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>

                      {/* Expanded Programs List */}
                      <CollapsibleContent>
                        <Separator />
                        <div className="p-4 pt-0">
                          <div className="mb-2 text-xs font-medium text-muted-foreground">
                            البرامج ({dept.programs.length})
                          </div>
                          <ScrollArea className="max-h-64">
                            <div className="space-y-2">
                              {dept.programs.length === 0 ? (
                                <p className="py-6 text-center text-xs text-muted-foreground">
                                  لا توجد برامج
                                </p>
                              ) : (
                                dept.programs.map((prog) => {
                                  const statusStyle =
                                    STATUS_COLORS[prog.status] || STATUS_COLORS['لم تبدأ']
                                  const progColor = getProgressColor(prog.progress)
                                  return (
                                    <motion.div
                                      key={prog.id}
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className="rounded-lg border p-3"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 space-y-1">
                                          <p className="text-xs font-medium leading-tight text-foreground">
                                            {prog.name}
                                          </p>
                                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            {prog.employee && (
                                              <span className="flex items-center gap-1">
                                                <span
                                                  className="size-1.5 rounded-full"
                                                  style={{ backgroundColor: color }}
                                                />
                                                {prog.employee.name}
                                              </span>
                                            )}
                                            <span>•</span>
                                            <span>{MONTHS[prog.month - 1]}</span>
                                          </div>
                                        </div>
                                        <span
                                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                                        >
                                          <span className={`size-1 rounded-full ${statusStyle.dot}`} />
                                          {prog.status}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                          <div
                                            className={`h-full rounded-full ${progColor}`}
                                            style={{ width: `${prog.progress}%` }}
                                          />
                                        </div>
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                          {prog.progress}%
                                        </span>
                                      </div>
                                    </motion.div>
                                  )
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
