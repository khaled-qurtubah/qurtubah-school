'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTHS, STATUS_COLORS } from '@/lib/constants'
import type { Program, Department, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText, Download, Printer, Calendar, Users, Building2,
  BarChart3, Target, AlertCircle, FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'

// XSS protection: escape user-supplied data before inserting into HTML
const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Helper to unwrap API response (handles both { data: [...] } and [...] formats)
function unwrap<T>(res: { data?: T } | T): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data ?? res
  }
  return res as T
}

export default function ReportsTab() {
  const { filters, lastUpdated } = useAppStore()
  const [reportType, setReportType] = useState('monthly')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [programs, setPrograms] = useState<Program[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [progRes, deptRes, empRes] = await Promise.all([
        fetch('/api/programs?limit=9999'),
        fetch('/api/departments'),
        fetch('/api/employees'),
      ])

      if (!progRes.ok || !deptRes.ok || !empRes.ok) {
        throw new Error('فشل في تحميل البيانات')
      }

      const progData = await progRes.json()
      const deptData = await deptRes.json()
      const empData = await empRes.json()

      setPrograms(unwrap<Program[]>(progData))
      setDepartments(unwrap<Department[]>(deptData))
      setEmployees(unwrap<Employee[]>(empData))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
      toast.error('فشل في تحميل بيانات التقارير')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData, lastUpdated])

  const filteredPrograms = programs.filter(p => {
    if (selectedDepartment !== 'all' && p.departmentId !== selectedDepartment) return false
    return true
  })

  const completedCount = filteredPrograms.filter(p => p.status === 'مكتملة').length
  const inProgressCount = filteredPrograms.filter(p => p.status === 'قيد التنفيذ').length
  const notStartedCount = filteredPrograms.filter(p => p.status === 'لم تبدأ').length
  const cancelledCount = filteredPrograms.filter(p => p.status === 'ملغاة').length
  const avgProgress =
    filteredPrograms.length > 0
      ? Math.round(filteredPrograms.reduce((sum, p) => sum + p.progress, 0) / filteredPrograms.length)
      : 0

  const reportTypes = [
    { id: 'monthly', label: 'تقرير البرامج الشهري', icon: Calendar, description: 'تقرير شامل لجميع البرامج بالشهر' },
    { id: 'department', label: 'تقرير حسب القسم', icon: Building2, description: 'تفاصيل البرامج لكل قسم' },
    { id: 'employee', label: 'تقرير الموظفين', icon: Users, description: 'أداء الموظفين ومتابعة البرامج' },
    { id: 'achievement', label: 'تقرير الإنجاز العام', icon: BarChart3, description: 'نسب الإنجاز والتقدم العام' },
    { id: 'operational', label: 'تقرير الخطة التشغيلية', icon: Target, description: 'تتبع الخطة التشغيلية للمدرسة' },
  ]

  // ---- Generate Print Report HTML based on report type ----
  const generatePrintReport = () => {
    setIsGenerating(true)
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('لا يمكن فتح نافذة الطباعة')
      setIsGenerating(false)
      return
    }

    const reportTitle = reportTypes.find(r => r.id === reportType)?.label ?? 'تقرير عام'
    const html = buildReportHTML(reportType, reportTitle, filteredPrograms, departments, employees)
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      setIsGenerating(false)
    }, 500)
  }

  // ---- Generate CSV ----
  const generateCSV = () => {
    const headers = ['الرقم', 'البرنامج', 'القسم', 'المسؤول', 'الحالة', 'الأولوية', 'التقدم', 'الشهر']
    const rows = filteredPrograms.map((p, i) => [
      i + 1,
      p.name,
      p.department?.name || '-',
      p.employee?.name || '-',
      p.status,
      p.priority,
      p.progress + '%',
      MONTHS[p.month - 1] || '-',
    ])

    const BOM = '\uFEFF'
    const csv =
      BOM +
      [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `تقرير_مدارس_قرطبة_${new Date().toLocaleDateString('ar-SA')}.csv`
    link.click()
    toast.success('تم تصدير التقرير بنجاح')
  }

  // ---- Generate Excel-compatible TSV ----
  const generateExcel = () => {
    const headers = ['الرقم', 'البرنامج', 'القسم', 'المسؤول', 'الحالة', 'الأولوية', 'التقدم', 'الشهر']
    const rows = filteredPrograms.map((p, i) => [
      i + 1,
      p.name,
      p.department?.name || '-',
      p.employee?.name || '-',
      p.status,
      p.priority,
      p.progress + '%',
      MONTHS[p.month - 1] || '-',
    ])

    const BOM = '\uFEFF'
    const sepRow = 'sep="\t"'
    const tsv =
      BOM +
      sepRow + '\n' +
      headers.join('\t') + '\n' +
      rows.map(r => r.join('\t')).join('\n')
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `تقرير_مدارس_قرطبة_${new Date().toLocaleDateString('ar-SA')}.xls`
    link.click()
    toast.success('تم تصدير التقرير بصيغة Excel بنجاح')
  }

  // ---- Get progress bar color class ----
  const progressColor = (value: number) => {
    if (value >= 80) return 'bg-emerald-500'
    if (value >= 50) return 'bg-blue-500'
    if (value >= 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // ---- Render preview table content based on report type ----
  const renderPreviewContent = () => {
    if (filteredPrograms.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات لعرض التقرير</p>
        </div>
      )
    }

    switch (reportType) {
      case 'monthly':
        return renderMonthlyPreview()
      case 'department':
        return renderDepartmentPreview()
      case 'employee':
        return renderEmployeePreview()
      case 'achievement':
        return renderAchievementPreview()
      case 'operational':
        return renderOperationalPreview()
      default:
        return renderMonthlyPreview()
    }
  }

  // Monthly: Programs grouped by month
  const renderMonthlyPreview = () => {
    const grouped = new Map<number, Program[]>()
    filteredPrograms.forEach(p => {
      const list = grouped.get(p.month) || []
      list.push(p)
      grouped.set(p.month, list)
    })

    const sortedMonths = [...grouped.keys()].sort((a, b) => a - b)

    return (
      <div className="space-y-4">
        {sortedMonths.map(month => (
          <div key={month}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {MONTHS[month - 1]}
              </span>
              <Badge className="text-xs" variant="secondary">
                {grouped.get(month)!.length} برنامج
              </Badge>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-2 px-3 font-medium text-gray-500">#</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">البرنامج</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">القسم</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">الحالة</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">التقدم</th>
                </tr>
              </thead>
              <tbody>
                {grouped.get(month)!.map((p, i) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      <span
                        className="inline-block w-2 h-2 rounded-full ml-1"
                        style={{ backgroundColor: p.department?.color }}
                      />
                      {p.department?.name || '-'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]?.bg} ${STATUS_COLORS[p.status]?.text}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progressColor(p.progress)}`}
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{p.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    )
  }

  // Department: Programs grouped by department with stats
  const renderDepartmentPreview = () => {
    const grouped = new Map<string, Program[]>()
    filteredPrograms.forEach(p => {
      const key = p.departmentId || '__none__'
      const list = grouped.get(key) || []
      list.push(p)
      grouped.set(key, list)
    })

    return (
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([deptId, deptPrograms]) => {
          const dept = departments.find(d => d.id === deptId)
          const deptCompleted = deptPrograms.filter(p => p.status === 'مكتملة').length
          const deptAvgProgress = Math.round(
            deptPrograms.reduce((s, p) => s + p.progress, 0) / deptPrograms.length
          )

          return (
            <div key={deptId}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4" style={{ color: dept?.color || '#6b7280' }} />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {dept?.name || 'بدون قسم'}
                </span>
                <span className="text-xs text-gray-400">
                  ({deptPrograms.length} برنامج | {deptCompleted} مكتمل | متوسط التقدم {deptAvgProgress}%)
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-right py-2 px-3 font-medium text-gray-500">#</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">البرنامج</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">المسؤول</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">الحالة</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">التقدم</th>
                  </tr>
                </thead>
                <tbody>
                  {deptPrograms.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                        {p.employee?.name || '-'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]?.bg} ${STATUS_COLORS[p.status]?.text}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${progressColor(p.progress)}`}
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{p.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  // Employee: Programs grouped by employee with stats
  const renderEmployeePreview = () => {
    const grouped = new Map<string, Program[]>()
    filteredPrograms.forEach(p => {
      const key = p.employeeId || '__none__'
      const list = grouped.get(key) || []
      list.push(p)
      grouped.set(key, list)
    })

    return (
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([empId, empPrograms]) => {
          const emp = employees.find(e => e.id === empId)
          const empCompleted = empPrograms.filter(p => p.status === 'مكتملة').length
          const empAvgProgress = Math.round(
            empPrograms.reduce((s, p) => s + p.progress, 0) / empPrograms.length
          )

          return (
            <div key={empId}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {emp?.name || 'بدون مسؤول'}
                </span>
                {emp?.position && (
                  <span className="text-xs text-gray-400">({emp.position})</span>
                )}
                <span className="text-xs text-gray-400">
                  ({empPrograms.length} برنامج | {empCompleted} مكتمل | متوسط التقدم {empAvgProgress}%)
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-right py-2 px-3 font-medium text-gray-500">#</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">البرنامج</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">القسم</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">الحالة</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">التقدم</th>
                  </tr>
                </thead>
                <tbody>
                  {empPrograms.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                        <span
                          className="inline-block w-2 h-2 rounded-full ml-1"
                          style={{ backgroundColor: p.department?.color }}
                        />
                        {p.department?.name || '-'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]?.bg} ${STATUS_COLORS[p.status]?.text}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${progressColor(p.progress)}`}
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{p.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  // Achievement: Completed/in-progress stats with progress bars
  const renderAchievementPreview = () => {
    const statusGroups = {
      'مكتملة': filteredPrograms.filter(p => p.status === 'مكتملة'),
      'قيد التنفيذ': filteredPrograms.filter(p => p.status === 'قيد التنفيذ'),
      'لم تبدأ': filteredPrograms.filter(p => p.status === 'لم تبدأ'),
      'ملغاة': filteredPrograms.filter(p => p.status === 'ملغاة'),
    }

    return (
      <div className="space-y-4">
        {/* Status breakdown cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(statusGroups).map(([status, progs]) => {
            const percentage = filteredPrograms.length > 0
              ? Math.round((progs.length / filteredPrograms.length) * 100)
              : 0
            return (
              <div
                key={status}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center"
              >
                <div className="text-lg font-bold text-gray-900 dark:text-white">{progs.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{status}</div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${status === 'مكتملة' ? 'bg-emerald-500' : status === 'قيد التنفيذ' ? 'bg-blue-500' : status === 'ملغاة' ? 'bg-red-500' : 'bg-gray-400'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">{percentage}%</div>
              </div>
            )
          })}
        </div>

        {/* Overall progress bar */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">متوسط التقدم العام</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{avgProgress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>

        {/* Programs list sorted by progress */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-right py-2 px-3 font-medium text-gray-500">#</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">البرنامج</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">القسم</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">الحالة</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 min-w-[120px]">التقدم</th>
            </tr>
          </thead>
          <tbody>
            {[...filteredPrograms]
              .sort((a, b) => b.progress - a.progress)
              .map((p, i) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {p.department?.name || '-'}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]?.bg} ${STATUS_COLORS[p.status]?.text}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progressColor(p.progress)}`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-left">{p.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Operational: Summary of all operational metrics
  const renderOperationalPreview = () => {
    const activeDepartments = departments.filter(d =>
      filteredPrograms.some(p => p.departmentId === d.id)
    )
    const activeEmployees = employees.filter(e =>
      filteredPrograms.some(p => p.employeeId === e.id)
    )

    // Priority breakdown
    const priorityGroups = new Map<string, Program[]>()
    filteredPrograms.forEach(p => {
      const list = priorityGroups.get(p.priority) || []
      list.push(p)
      priorityGroups.set(p.priority, list)
    })

    // Monthly distribution
    const monthGroups = new Map<number, Program[]>()
    filteredPrograms.forEach(p => {
      const list = monthGroups.get(p.month) || []
      list.push(p)
      monthGroups.set(p.month, list)
    })

    return (
      <div className="space-y-4">
        {/* Operational summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{departments.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">إجمالي الأقسام</div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {activeDepartments.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">أقسام نشطة</div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{employees.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">إجمالي الموظفين</div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {activeEmployees.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">موظفون مشاركون</div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {filteredPrograms.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">إجمالي البرامج</div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{avgProgress}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">متوسط التقدم</div>
          </div>
        </div>

        {/* Priority breakdown */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            توزيع حسب الأولوية
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from(priorityGroups.entries()).map(([priority, progs]) => {
              const pct = filteredPrograms.length > 0
                ? Math.round((progs.length / filteredPrograms.length) * 100)
                : 0
              return (
                <div
                  key={priority}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      {priority}
                    </span>
                    <span className="text-xs text-gray-400">{progs.length}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${priority === 'عاجلة' ? 'bg-red-500' : priority === 'عالية' ? 'bg-orange-500' : priority === 'متوسطة' ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly distribution */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            التوزيع الشهري للبرامج
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from(monthGroups.entries())
              .sort(([a], [b]) => a - b)
              .map(([month, progs]) => (
                <div
                  key={month}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-center"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {MONTHS[month - 1]}
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {progs.length}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Department summary table */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            ملخص أداء الأقسام
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-2 px-3 font-medium text-gray-500">القسم</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">عدد البرامج</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">مكتملة</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">متوسط التقدم</th>
              </tr>
            </thead>
            <tbody>
              {activeDepartments.map(dept => {
                const deptProgs = filteredPrograms.filter(p => p.departmentId === dept.id)
                const deptCompleted = deptProgs.filter(p => p.status === 'مكتملة').length
                const deptAvg = Math.round(
                  deptProgs.reduce((s, p) => s + p.progress, 0) / deptProgs.length
                )
                return (
                  <tr key={dept.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                      <span
                        className="inline-block w-2 h-2 rounded-full ml-1"
                        style={{ backgroundColor: dept.color }}
                      />
                      {dept.name}
                    </td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{deptProgs.length}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      {deptCompleted}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progressColor(deptAvg)}`}
                            style={{ width: `${deptAvg}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-left">{deptAvg}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="rounded-xl">
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  // ---- Error State ----
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">التقارير</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">إنشاء وتصدير التقارير الرسمية</p>
          </div>
        </div>
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{error}</p>
            <Button onClick={fetchData} variant="outline">
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* عنوان القسم */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">التقارير</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">إنشاء وتصدير التقارير الرسمية</p>
        </div>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card animate-stagger-1 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{filteredPrograms.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">إجمالي البرامج</div>
        </div>
        <div className="surface-card animate-stagger-2 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">برامج مكتملة</div>
        </div>
        <div className="surface-card animate-stagger-3 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">قيد التنفيذ</div>
        </div>
        <div className="surface-card animate-stagger-4 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{avgProgress}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">متوسط التقدم</div>
        </div>
      </div>

      {/* اختيار نوع التقرير */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((rt, rtIdx) => {
          const Icon = rt.icon
          const staggerClass = `animate-stagger-${Math.min(rtIdx + 1, 8)}`
          return (
            <Card
              key={rt.id}
              className={`rounded-xl cursor-pointer card-lift transition-all ${staggerClass} ${
                reportType === rt.id
                  ? 'border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 glow-emerald'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setReportType(rt.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      reportType === rt.id
                        ? 'bg-emerald-100 dark:bg-emerald-900/50'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        reportType === rt.id
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{rt.label}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rt.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* فلتر القسم + أزرار الإجراءات */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                فلتر حسب القسم
              </label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="كل الأقسام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأقسام</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={generatePrintReport}
                disabled={isGenerating}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700"
              >
                <Printer className="h-4 w-4 ml-2" />
                طباعة التقرير
              </Button>
              <Button onClick={generateCSV} variant="outline" className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 ml-2" />
                تصدير CSV
              </Button>
              <Button onClick={generateExcel} variant="outline" className="flex-1 sm:flex-none">
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* معاينة التقرير */}
      <div className="gradient-border p-[1.5px] rounded-[var(--radius-lg)]">
        <Card className="rounded-[var(--radius-lg)] overflow-hidden shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">معاينة التقرير</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="border border-gray-200/80 dark:border-gray-700/80 rounded-lg overflow-hidden shadow-inner">
              <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-4 text-center border-b">
                <img
                  src="/logo-school.png"
                  alt="الشعار"
                  className="w-16 h-16 mx-auto mb-2 rounded-full shadow-sm"
                />
                <h3 className="font-bold text-gray-900 dark:text-white">مدارس قرطبة الأهلية</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {reportTypes.find(r => r.id === reportType)?.label} - {filters.year}
                </p>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto">{renderPreviewContent()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ===========================================================================
// Print Report HTML Generator
// ===========================================================================
function buildReportHTML(
  reportType: string,
  reportTitle: string,
  programs: Program[],
  departments: Department[],
  employees: Employee[]
): string {
  const completed = programs.filter(p => p.status === 'مكتملة').length
  const inProgress = programs.filter(p => p.status === 'قيد التنفيذ').length
  const notStarted = programs.filter(p => p.status === 'لم تبدأ').length
  const cancelled = programs.filter(p => p.status === 'ملغاة').length
  const avgProgress =
    programs.length > 0
      ? Math.round(programs.reduce((s, p) => s + p.progress, 0) / programs.length)
      : 0

  const today = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Build type-specific content
  let tableContent = ''
  let extraContent = ''
  const rowCounter = { count: 0 }

  switch (reportType) {
    case 'monthly': {
      const grouped = new Map<number, Program[]>()
      programs.forEach(p => {
        const list = grouped.get(p.month) || []
        list.push(p)
        grouped.set(p.month, list)
      })
      const sortedMonths = [...grouped.keys()].sort((a, b) => a - b)
      tableContent = sortedMonths
        .map(month => {
          const monthPrograms = grouped.get(month)!
          const rows = monthPrograms
            .map((p, i) => buildProgramRow(p, i + 1, rowCounter))
            .join('')
          return `
          <tr>
            <td colspan="7" style="background:#f0fdf4;padding:10px 12px;font-weight:700;color:#166534;border-bottom:2px solid #bbf7d0;">
              ${esc(MONTHS[month - 1])} (${monthPrograms.length} برنامج)
            </td>
          </tr>
          ${rows}`
        })
        .join('')
      break
    }

    case 'department': {
      const grouped = new Map<string, Program[]>()
      programs.forEach(p => {
        const key = p.departmentId || '__none__'
        const list = grouped.get(key) || []
        list.push(p)
        grouped.set(key, list)
      })
      tableContent = Array.from(grouped.entries())
        .map(([deptId, deptPrograms]) => {
          const dept = departments.find(d => d.id === deptId)
          const deptCompleted = deptPrograms.filter(p => p.status === 'مكتملة').length
          const deptAvg = Math.round(
            deptPrograms.reduce((s, p) => s + p.progress, 0) / deptPrograms.length
          )
          const rows = deptPrograms.map((p, i) => buildProgramRow(p, i + 1, rowCounter)).join('')
          return `
          <tr>
            <td colspan="7" style="padding:10px 12px;font-weight:700;color:#1e40af;border-bottom:2px solid #dbeafe;background:#f8fafc;">
              ${esc(dept?.name || 'بدون قسم')} &mdash; ${deptPrograms.length} برنامج | ${deptCompleted} مكتمل | متوسط التقدم ${deptAvg}%
            </td>
          </tr>
          ${rows}`
        })
        .join('')
      break
    }

    case 'employee': {
      const grouped = new Map<string, Program[]>()
      programs.forEach(p => {
        const key = p.employeeId || '__none__'
        const list = grouped.get(key) || []
        list.push(p)
        grouped.set(key, list)
      })
      tableContent = Array.from(grouped.entries())
        .map(([empId, empPrograms]) => {
          const emp = employees.find(e => e.id === empId)
          const empCompleted = empPrograms.filter(p => p.status === 'مكتملة').length
          const empAvg = Math.round(
            empPrograms.reduce((s, p) => s + p.progress, 0) / empPrograms.length
          )
          const rows = empPrograms.map((p, i) => buildProgramRow(p, i + 1, rowCounter)).join('')
          return `
          <tr>
            <td colspan="7" style="padding:10px 12px;font-weight:700;color:#7c3aed;border-bottom:2px solid #ede9fe;background:#faf5ff;">
              ${esc(emp?.name || 'بدون مسؤول')}${emp?.position ? ' (' + esc(emp.position) + ')' : ''} &mdash; ${empPrograms.length} برنامج | ${empCompleted} مكتمل | متوسط التقدم ${empAvg}%
            </td>
          </tr>
          ${rows}`
        })
        .join('')
      break
    }

    case 'achievement': {
      // Status breakdown
      const statusData = [
        { name: 'مكتملة', count: completed, color: '#10b981', bgClass: '#dcfce7', textClass: '#166534' },
        { name: 'قيد التنفيذ', count: inProgress, color: '#3b82f6', bgClass: '#dbeafe', textClass: '#1e40af' },
        { name: 'لم تبدأ', count: notStarted, color: '#6b7280', bgClass: '#f3f4f6', textClass: '#374151' },
        { name: 'ملغاة', count: cancelled, color: '#ef4444', bgClass: '#fee2e2', textClass: '#991b1b' },
      ]
      extraContent = `
        <div style="margin-bottom:25px;">
          <h3 style="font-size:16px;font-weight:700;color:#334155;margin-bottom:12px;">تحليل حالة الإنجاز</h3>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
            ${statusData
              .map(
                s => `
              <div style="background:${s.bgClass};border-radius:10px;padding:15px;text-align:center;border:1px solid #e2e8f0;">
                <div style="font-size:28px;font-weight:800;color:${s.textClass};">${s.count}</div>
                <div style="font-size:12px;color:#666;margin-top:5px;">${esc(s.name)}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${programs.length > 0 ? Math.round((s.count / programs.length) * 100) : 0}% من الإجمالي</div>
              </div>`
              )
              .join('')}
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:15px;border:1px solid #e2e8f0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:14px;font-weight:600;color:#334155;">متوسط التقدم العام</span>
              <span style="font-size:14px;font-weight:800;color:#10b981;">${avgProgress}%</span>
            </div>
            <div style="width:100%;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;">
              <div style="width:${avgProgress}%;height:100%;background:#10b981;border-radius:5px;"></div>
            </div>
          </div>
        </div>`

      // Programs sorted by progress
      const sortedPrograms = [...programs].sort((a, b) => b.progress - a.progress)
      tableContent = sortedPrograms.map((p, i) => buildProgramRow(p, i + 1, rowCounter)).join('')
      break
    }

    case 'operational': {
      const activeDepartments = departments.filter(d => programs.some(p => p.departmentId === d.id))
      const activeEmployees = employees.filter(e => programs.some(p => p.employeeId === e.id))

      // Priority breakdown
      const priorityGroups = new Map<string, Program[]>()
      programs.forEach(p => {
        const list = priorityGroups.get(p.priority) || []
        list.push(p)
        priorityGroups.set(p.priority, list)
      })

      // Monthly distribution
      const monthGroups = new Map<number, Program[]>()
      programs.forEach(p => {
        const list = monthGroups.get(p.month) || []
        list.push(p)
        monthGroups.set(p.month, list)
      })

      extraContent = `
        <div style="margin-bottom:25px;">
          <h3 style="font-size:16px;font-weight:700;color:#334155;margin-bottom:12px;">ملخص المؤشرات التشغيلية</h3>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
            <div style="background:#f8fafc;border-radius:10px;padding:15px;text-align:center;border:1px solid #e2e8f0;">
              <div style="font-size:28px;font-weight:800;color:#334155;">${departments.length}</div>
              <div style="font-size:12px;color:#666;margin-top:5px;">إجمالي الأقسام</div>
              <div style="font-size:11px;color:#10b981;margin-top:2px;">${activeDepartments.length} نشط</div>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:15px;text-align:center;border:1px solid #e2e8f0;">
              <div style="font-size:28px;font-weight:800;color:#334155;">${employees.length}</div>
              <div style="font-size:12px;color:#666;margin-top:5px;">إجمالي الموظفين</div>
              <div style="font-size:11px;color:#10b981;margin-top:2px;">${activeEmployees.length} مشارك</div>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:15px;text-align:center;border:1px solid #e2e8f0;">
              <div style="font-size:28px;font-weight:800;color:#8b5cf6;">${avgProgress}%</div>
              <div style="font-size:12px;color:#666;margin-top:5px;">متوسط التقدم</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${programs.length} برنامج</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div style="background:#f8fafc;border-radius:10px;padding:15px;border:1px solid #e2e8f0;">
              <h4 style="font-size:13px;font-weight:700;color:#475569;margin-bottom:10px;">توزيع حسب الأولوية</h4>
              ${Array.from(priorityGroups.entries())
                .map(
                  ([priority, progs]) => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <span style="font-size:12px;width:50px;color:#475569;">${esc(priority)}</span>
                  <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                    <div style="width:${programs.length > 0 ? Math.round((progs.length / programs.length) * 100) : 0}%;height:100%;background:${
                      priority === 'عاجلة' ? '#ef4444' : priority === 'عالية' ? '#f97316' : priority === 'متوسطة' ? '#eab308' : '#22c55e'
                    };border-radius:4px;"></div>
                  </div>
                  <span style="font-size:11px;color:#94a3b8;width:24px;text-align:left;">${progs.length}</span>
                </div>`
                )
                .join('')}
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:15px;border:1px solid #e2e8f0;">
              <h4 style="font-size:13px;font-weight:700;color:#475569;margin-bottom:10px;">التوزيع الشهري</h4>
              ${Array.from(monthGroups.entries())
                .sort(([a], [b]) => a - b)
                .map(
                  ([month, progs]) => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <span style="font-size:12px;width:50px;color:#475569;">${esc(MONTHS[month - 1])}</span>
                  <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                    <div style="width:${programs.length > 0 ? Math.round((progs.length / programs.length) * 100) : 0}%;height:100%;background:#10b981;border-radius:4px;"></div>
                  </div>
                  <span style="font-size:11px;color:#94a3b8;width:24px;text-align:left;">${progs.length}</span>
                </div>`
                )
                .join('')}
            </div>
          </div>
        </div>`

      // Department summary table
      tableContent = activeDepartments
        .map(dept => {
          const deptProgs = programs.filter(p => p.departmentId === dept.id)
          const deptCompleted = deptProgs.filter(p => p.status === 'مكتملة').length
          const deptAvg = Math.round(
            deptProgs.reduce((s, p) => s + p.progress, 0) / deptProgs.length
          )
          return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${esc(dept.color)};margin-left:6px;"></span>
              ${esc(dept.name)}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${deptProgs.length}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${deptCompleted}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${deptAvg}%</td>
          </tr>`
        })
        .join('')

      // Override the main table headers for operational
      return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${esc(reportTitle)} - مدارس قرطبة الأهلية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
    * { font-family: 'Tajawal', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 40px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
    .header img { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px; }
    .header h1 { font-size: 24px; font-weight: 800; color: #10b981; }
    .header p { color: #666; font-size: 14px; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #f1f5f9; display: table-header-group; }
    th { padding: 10px 12px; text-align: right; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    tr { page-break-inside: avoid; }
    .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
    @page {
      @top-center { content: "مدارس قرطبة الأهلية"; }
      @bottom-center { content: "صفحة " counter(page) " من " counter(pages); }
    }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="/logo-school.png" alt="الشعار" />
    <h1>مدارس قرطبة الأهلية</h1>
    <p>${esc(reportTitle)}</p>
    <p>تاريخ التقرير: ${today}</p>
  </div>
  ${extraContent}
  <h3 style="font-size:16px;font-weight:700;color:#334155;margin-bottom:12px;">ملخص أداء الأقسام</h3>
  <table>
    <thead>
      <tr>
        <th>القسم</th>
        <th style="text-align:center;">عدد البرامج</th>
        <th style="text-align:center;">مكتملة</th>
        <th style="text-align:center;">متوسط التقدم</th>
      </tr>
    </thead>
    <tbody>
      ${tableContent}
    </tbody>
  </table>
  <div class="footer">
    <p>تم إنشاء هذا التقرير تلقائيًا بواسطة نظام إدارة البرامج والأنشطة المدرسية - مدارس قرطبة الأهلية</p>
    <p>&copy; ${new Date().getFullYear()} مدارس قرطبة الأهلية</p>
  </div>
</body>
</html>`
    }

    default:
      tableContent = programs.map((p, i) => buildProgramRow(p, i + 1, rowCounter)).join('')
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${esc(reportTitle)} - مدارس قرطبة الأهلية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
    * { font-family: 'Tajawal', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 40px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
    .header img { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px; }
    .header h1 { font-size: 24px; font-weight: 800; color: #10b981; }
    .header p { color: #666; font-size: 14px; margin-top: 5px; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 25px; }
    .summary-card { background: #f8fafc; border-radius: 10px; padding: 15px; text-align: center; border: 1px solid #e2e8f0; }
    .summary-card .number { font-size: 28px; font-weight: 800; }
    .summary-card .label { font-size: 12px; color: #666; margin-top: 5px; }
    .green { color: #10b981; } .blue { color: #3b82f6; } .yellow { color: #eab308; } .red { color: #ef4444; } .purple { color: #8b5cf6; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #f1f5f9; display: table-header-group; }
    th { padding: 10px 12px; text-align: right; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    tr { page-break-inside: avoid; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .progress-bar { width: 60px; height: 6px; background: #e2e8f0; border-radius: 3px; display: inline-block; vertical-align: middle; margin-left: 8px; }
    .progress-fill { height: 100%; border-radius: 3px; }
    .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
    @page {
      @top-center { content: "مدارس قرطبة الأهلية"; }
      @bottom-center { content: "صفحة " counter(page) " من " counter(pages); }
    }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="/logo-school.png" alt="الشعار" />
    <h1>مدارس قرطبة الأهلية</h1>
    <p>${esc(reportTitle)}</p>
    <p>تاريخ التقرير: ${today}</p>
  </div>
  ${reportType === 'achievement' ? '' : `<div class="summary">
    <div class="summary-card"><div class="number">${programs.length}</div><div class="label">إجمالي البرامج</div></div>
    <div class="summary-card"><div class="number green">${completed}</div><div class="label">مكتملة</div></div>
    <div class="summary-card"><div class="number blue">${inProgress}</div><div class="label">قيد التنفيذ</div></div>
    <div class="summary-card"><div class="number red">${cancelled}</div><div class="label">ملغاة</div></div>
    <div class="summary-card"><div class="number purple">${avgProgress}%</div><div class="label">متوسط التقدم</div></div>
  </div>`}
  ${extraContent}
  <table>
    <thead>
      <tr>
        <th>#</th><th>البرنامج</th><th>القسم</th><th>المسؤول</th><th>الحالة</th><th>الأولوية</th><th>التقدم</th>
      </tr>
    </thead>
    <tbody>
      ${tableContent}
    </tbody>
  </table>
  <div class="footer">
    <p>تم إنشاء هذا التقرير تلقائيًا بواسطة نظام إدارة البرامج والأنشطة المدرسية - مدارس قرطبة الأهلية</p>
    <p>&copy; ${new Date().getFullYear()} مدارس قرطبة الأهلية</p>
  </div>
</body>
</html>`
}

// Helper: Build a single program table row for print HTML (XSS-safe)
function buildProgramRow(p: Program, index: number, counter?: { count: number }): string {
  const statusClass =
    p.status === 'مكتملة' ? 'green' : p.status === 'قيد التنفيذ' ? 'blue' : p.status === 'ملغاة' ? 'red' : 'gray'
  const progressColor =
    p.progress >= 80 ? '#10b981' : p.progress >= 50 ? '#3b82f6' : p.progress >= 25 ? '#eab308' : '#ef4444'
  if (counter) counter.count++
  const shouldBreak = counter && counter.count > 0 && counter.count % 25 === 0
  const breakStyle = shouldBreak ? ' style="page-break-after: always;"' : ' style="page-break-inside: avoid;"'
  return `<tr${breakStyle}>
    <td>${index}</td>
    <td><strong>${esc(p.name)}</strong></td>
    <td>${esc(p.department?.name || '-')}</td>
    <td>${esc(p.employee?.name || '-')}</td>
    <td><span class="badge badge-${statusClass}">${esc(p.status)}</span></td>
    <td>${esc(p.priority)}</td>
    <td>${p.progress}%
      <span class="progress-bar"><span class="progress-fill" style="width:${p.progress}%;background:${progressColor}"></span></span>
    </td>
  </tr>`
}
