import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface YearStats {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  cancelled: number
  avgProgress: number
  programsByDepartment: { name: string; color: string; count: number }[]
  programsByStatus: Record<string, number>
  programsByPriority: Record<string, number>
  programsByMonth: { month: number; name: string; total: number; completed: number; inProgress: number }[]
  employeePerformance: { id: string; name: string; department: string | null; totalPrograms: number; completedPrograms: number; avgProgress: number }[]
  year: number
}

async function computeStatsForYear(year: number): Promise<YearStats> {
  const programs = await db.program.findMany({
    where: { year },
    include: { department: true, employee: true },
  })

  const total = programs.length
  const completed = programs.filter((p) => p.status === 'مكتملة').length
  const inProgress = programs.filter((p) => p.status === 'قيد التنفيذ').length
  const notStarted = programs.filter((p) => p.status === 'لم تبدأ').length
  const cancelled = programs.filter((p) => p.status === 'ملغاة').length
  const avgProgress = total > 0
    ? Math.round(programs.reduce((sum, p) => sum + p.progress, 0) / total)
    : 0

  // Programs by department
  const departmentMap: Record<string, { name: string; color: string; count: number }> = {}
  for (const p of programs) {
    const deptName = p.department?.name || 'بدون قسم'
    const deptColor = p.department?.color || '#999999'
    if (!departmentMap[deptName]) {
      departmentMap[deptName] = { name: deptName, color: deptColor, count: 0 }
    }
    departmentMap[deptName].count++
  }
  const programsByDepartment = Object.values(departmentMap).sort((a, b) => b.count - a.count)

  // Programs by status
  const programsByStatus: Record<string, number> = {}
  for (const status of ['لم تبدأ', 'قيد التنفيذ', 'مكتملة', 'ملغاة']) {
    programsByStatus[status] = programs.filter((p) => p.status === status).length
  }

  // Programs by priority
  const programsByPriority: Record<string, number> = {}
  for (const priority of ['عاجلة', 'عالية', 'متوسطة', 'منخفضة']) {
    programsByPriority[priority] = programs.filter((p) => p.priority === priority).length
  }

  // Programs by month
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  const programsByMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    name: monthNames[i],
    total: 0, completed: 0, inProgress: 0,
  }))
  for (const p of programs) {
    const idx = p.month - 1
    if (idx >= 0 && idx < 12) {
      programsByMonth[idx].total++
      if (p.status === 'مكتملة') programsByMonth[idx].completed++
      if (p.status === 'قيد التنفيذ') programsByMonth[idx].inProgress++
    }
  }

  // Employee performance
  const employeeMap: Record<string, {
    id: string; name: string; department: string | null
    totalPrograms: number; completedPrograms: number; avgProgress: number
  }> = {}
  for (const p of programs) {
    if (!p.employee) continue
    const empId = p.employee.id
    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        id: empId, name: p.employee.name,
        department: (p.employee as { department?: { name: string } | null }).department?.name ?? null,
        totalPrograms: 0, completedPrograms: 0, avgProgress: 0,
      }
    }
    employeeMap[empId].totalPrograms++
    if (p.status === 'مكتملة') employeeMap[empId].completedPrograms++
  }
  for (const empId in employeeMap) {
    const empPrograms = programs.filter((p) => p.employee?.id === empId)
    employeeMap[empId].avgProgress = empPrograms.length > 0
      ? Math.round(empPrograms.reduce((sum, p) => sum + p.progress, 0) / empPrograms.length)
      : 0
  }
  const employeePerformance = Object.values(employeeMap).sort(
    (a, b) => b.completedPrograms - a.completedPrograms
  )

  return {
    total, completed, inProgress, notStarted, cancelled, avgProgress,
    programsByDepartment, programsByStatus, programsByPriority, programsByMonth, employeePerformance, year,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
    const compareYear = parseInt(searchParams.get('compareYear') || '', 10)

    const currentStats = await computeStatsForYear(year)

    const result: Record<string, unknown> = {
      data: currentStats,
    }

    if (!isNaN(compareYear) && compareYear !== year) {
      const compareStats = await computeStatsForYear(compareYear)
      result.compareData = compareStats
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
