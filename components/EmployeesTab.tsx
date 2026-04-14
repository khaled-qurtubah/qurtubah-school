'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Users,
  ArrowUpDown,
  GitCompareArrows,
  Search,
} from 'lucide-react'
import {
  STATUS_COLORS,
  MONTHS,
  getProgressColor,
} from '@/lib/constants'
import { useAppStore } from '@/lib/store'
import type { Employee, Program, Department } from '@/lib/types'

type SortOption = 'name' | 'progress' | 'department' | 'programs'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .trim()
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

interface EmployeeWithStats extends Employee {
  avgProgress: number
  programCount: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  cancelledCount: number
}

export default function EmployeesTab() {
  const { lastUpdated } = useAppStore()
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('progress')
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')

  // Compare mode
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  // Detail dialog
  const [detailEmployee, setDetailEmployee] = useState<EmployeeWithStats | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [empRes, progRes, deptRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/programs'),
          fetch('/api/departments'),
        ])

        let empData: Employee[] = []
        let progData: Program[] = []
        let deptData: Department[] = []

        if (empRes.ok) {
          const raw = await empRes.json()
          empData = Array.isArray(raw) ? raw : raw.data || []
        }
        if (progRes.ok) {
          const raw = await progRes.json()
          progData = Array.isArray(raw) ? raw : raw.data || []
        }
        if (deptRes.ok) {
          const raw = await deptRes.json()
          deptData = Array.isArray(raw) ? raw : raw.data || []
        }

        setEmployees(empData)
        setPrograms(progData)
        setDepartments(deptData)
      } catch {
        setEmployees([])
        setPrograms([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [lastUpdated])

  const employeesWithStats = useMemo(() => {
    return employees.map((emp) => {
      const empPrograms = programs.filter((p) => p.employeeId === emp.id)
      const avgProgress =
        empPrograms.length > 0
          ? Math.round(empPrograms.reduce((sum, p) => sum + p.progress, 0) / empPrograms.length)
          : 0

      return {
        ...emp,
        avgProgress,
        programCount: empPrograms.length,
        completedCount: empPrograms.filter((p) => p.status === 'مكتملة').length,
        inProgressCount: empPrograms.filter((p) => p.status === 'قيد التنفيذ').length,
        notStartedCount: empPrograms.filter((p) => p.status === 'لم تبدأ').length,
        cancelledCount: empPrograms.filter((p) => p.status === 'ملغاة').length,
      }
    })
  }, [employees, programs])

  const displayedEmployees = useMemo(() => {
    let result = employeesWithStats

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q) ||
          e.department?.name.toLowerCase().includes(q)
      )
    }

    if (selectedDept !== 'all') {
      result = result.filter((e) => e.departmentId === selectedDept)
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ar')
        case 'progress':
          return b.avgProgress - a.avgProgress
        case 'department':
          return (a.department?.name || '').localeCompare(b.department?.name || '', 'ar')
        case 'programs':
          return b.programCount - a.programCount
        default:
          return 0
      }
    })

    return result
  }, [employeesWithStats, search, selectedDept, sortBy])

  const toggleCompare = useCallback(
    (id: string) => {
      setCompareIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        if (prev.length >= 3) return prev
        return [...prev, id]
      })
    },
    []
  )

  const compareEmployees = useMemo(
    () => employeesWithStats.filter((e) => compareIds.includes(e.id)),
    [employeesWithStats, compareIds]
  )

  const detailPrograms = useMemo(() => {
    if (!detailEmployee) return []
    return programs.filter((p) => p.employeeId === detailEmployee.id)
  }, [detailEmployee, programs])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن موظف..."
            className="h-9 w-56 pr-9"
          />
        </div>

        {/* Department filter */}
        <Select value={selectedDept} onValueChange={setSelectedDept}>
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

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger size="sm" className="w-40">
            <ArrowUpDown className="ml-1 size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progress">التقدم</SelectItem>
            <SelectItem value="name">الاسم</SelectItem>
            <SelectItem value="department">القسم</SelectItem>
            <SelectItem value="programs">عدد البرامج</SelectItem>
          </SelectContent>
        </Select>

        {/* Compare button */}
        {compareIds.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCompareOpen(true)}
            className="gap-1.5"
          >
            <GitCompareArrows className="size-3.5" />
            مقارنة ({compareIds.length})
          </Button>
        )}
      </div>

      {/* Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-4" />
        <span className="font-medium">{displayedEmployees.length} موظف</span>
      </div>

      {/* Grid */}
      {displayedEmployees.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users className="h-7 w-7" />
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">لا توجد نتائج</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">جرب تغيير معايير البحث</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {displayedEmployees.map((emp, idx) => {
              const deptColor = emp.department?.color || '#6b7280'
              const progressBg = getProgressColor(emp.avgProgress)
              const isCompared = compareIds.includes(emp.id)

              return (
                <motion.div
                  key={emp.id}
                  custom={idx}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={`cursor-pointer ${
                    isCompared ? 'ring-2 ring-emerald-500' : ''
                  }`}
                  onClick={() => setDetailEmployee(emp)}
                >
                  <Card className="h-full overflow-hidden py-0 card-lift">
                    <CardContent className="relative p-4">
                      {/* Compare checkbox */}
                      <div
                        className="absolute left-3 top-3 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isCompared}
                          onCheckedChange={() => toggleCompare(emp.id)}
                          disabled={!isCompared && compareIds.length >= 3}
                          aria-label={`مقارنة ${emp.name}`}
                        />
                      </div>

                      <div className="flex flex-col items-center gap-3 text-center">
                        {/* Avatar */}
                        <div
                          className="flex size-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm"
                          style={{ backgroundColor: deptColor }}
                        >
                          {getInitials(emp.name)}
                        </div>

                        {/* Name */}
                        <h3 className="text-base font-bold leading-tight text-foreground">
                          {emp.name}
                        </h3>

                        {/* Position */}
                        <p className="text-xs text-muted-foreground">{emp.position}</p>

                        {/* Department badge */}
                        {emp.department && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: hexToRgba(deptColor, 0.1),
                              color: deptColor,
                              borderColor: hexToRgba(deptColor, 0.2),
                            }}
                          >
                            {emp.department.name}
                          </Badge>
                        )}

                        <Separator className="my-1" />

                        {/* Workload Stacked Bar */}
                        {emp.programCount > 0 && (
                          <div className="w-full space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">عبء العمل</span>
                              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${
                                emp.programCount >= 8 ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800'
                                : emp.programCount >= 4 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {emp.programCount >= 8 ? 'ثقيل' : emp.programCount >= 4 ? 'متوسط' : 'خفيف'}
                              </Badge>
                            </div>
                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                              <motion.div
                                className="bg-emerald-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(emp.completedCount / emp.programCount) * 100}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.04 }}
                              />
                              <motion.div
                                className="bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(emp.inProgressCount / emp.programCount) * 100}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.04 + 0.1 }}
                              />
                              <motion.div
                                className="bg-gray-400 dark:bg-gray-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(emp.notStartedCount / emp.programCount) * 100}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.04 + 0.2 }}
                              />
                              {emp.cancelledCount > 0 && (
                                <motion.div
                                  className="bg-red-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(emp.cancelledCount / emp.programCount) * 100}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.04 + 0.3 }}
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-around text-[10px]">
                              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-500" />{emp.completedCount}</span>
                              <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400"><span className="size-1.5 rounded-full bg-blue-500" />{emp.inProgressCount}</span>
                              <span className="flex items-center gap-0.5 text-gray-600 dark:text-gray-400"><span className="size-1.5 rounded-full bg-gray-400" />{emp.notStartedCount}</span>
                              {emp.cancelledCount > 0 && (
                                <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400"><span className="size-1.5 rounded-full bg-red-500" />{emp.cancelledCount}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="w-full space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">متوسط التقدم</span>
                            <span className="font-semibold text-foreground">{emp.avgProgress}%</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                            <motion.div
                              className={`h-full rounded-full ${progressBg}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${emp.avgProgress}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.04 }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Employee Detail Dialog */}
      <Dialog open={!!detailEmployee} onOpenChange={(open) => !open && setDetailEmployee(null)}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl gradient-border">
          {detailEmployee && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-right">
                  <div
                    className="flex size-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: detailEmployee.department?.color || '#6b7280' }}
                  >
                    {getInitials(detailEmployee.name)}
                  </div>
                  {detailEmployee.name}
                </DialogTitle>
                <DialogDescription>
                  {detailEmployee.position}
                  {detailEmployee.department && ` • ${detailEmployee.department.name}`}
                </DialogDescription>
              </DialogHeader>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{detailEmployee.programCount}</p>
                  <p className="text-xs text-muted-foreground">إجمالي البرامج</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{detailEmployee.completedCount}</p>
                  <p className="text-xs text-muted-foreground">مكتملة</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{detailEmployee.avgProgress}%</p>
                  <p className="text-xs text-muted-foreground">متوسط التقدم</p>
                </div>
              </div>

              {/* Programs list */}
              <div className="text-sm font-medium text-foreground">البرامج المسندة</div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {detailPrograms.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      لا توجد برامج مسندة
                    </p>
                  ) : (
                    detailPrograms.map((prog) => {
                      const statusStyle = STATUS_COLORS[prog.status] || STATUS_COLORS['لم تبدأ']
                      const progBg = getProgressColor(prog.progress)
                      return (
                        <div
                          key={prog.id}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{prog.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {prog.department && <span>{prog.department.name}</span>}
                              {prog.department && <span>•</span>}
                              <span>{MONTHS[prog.month - 1]}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {prog.status}
                            </span>
                            <span className="text-xs font-medium text-foreground">{prog.progress}%</span>
                          </div>
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${progBg}`}
                              style={{ width: `${prog.progress}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <GitCompareArrows className="size-5" />
              مقارنة الموظفين
            </DialogTitle>
            <DialogDescription>
              مقارنة أداء الموظفين المحددين
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {compareEmployees.map((emp) => {
              const deptColor = emp.department?.color || '#6b7280'
              const progressBg = getProgressColor(emp.avgProgress)

              return (
                <Card key={emp.id} className="overflow-hidden py-0">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div
                        className="flex size-12 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: deptColor }}
                      >
                        {getInitials(emp.name)}
                      </div>
                      <h4 className="text-sm font-bold">{emp.name}</h4>
                      <p className="text-xs text-muted-foreground">{emp.position}</p>

                      <div className="mt-2 w-full space-y-2 text-right">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold">{emp.avgProgress}%</span>
                          <span className="text-muted-foreground">التقدم</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${progressBg}`}
                            style={{ width: `${emp.avgProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-bold">{emp.programCount}</span>
                          <span className="text-muted-foreground">البرامج</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{emp.completedCount}</span>
                          <span className="text-muted-foreground">مكتملة</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-blue-600 dark:text-blue-400">{emp.inProgressCount}</span>
                          <span className="text-muted-foreground">قيد التنفيذ</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-gray-600 dark:text-gray-400">{emp.notStartedCount}</span>
                          <span className="text-muted-foreground">لم تبدأ</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Bar comparison */}
          {compareEmployees.length > 1 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">مقارنة التقدم</h4>
              {compareEmployees.map((emp) => {
                const deptColor = emp.department?.color || '#6b7280'
                return (
                  <div key={emp.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">{emp.avgProgress}%</span>
                      <span className="text-muted-foreground">{emp.name}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: deptColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${emp.avgProgress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
