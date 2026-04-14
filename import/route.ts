import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MONTHS } from '@/lib/constants'

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(line => {
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current.trim())
    return cells
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'لم يتم اختيار ملف' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'يرجى اختيار ملف CSV' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return NextResponse.json({ error: 'الملف فارغ أو لا يحتوي على بيانات كافية' }, { status: 400 })
    }

    // Parse header row
    const header = rows[0].map(h => h.replace(/\s+/g, ' ').trim())
    const colMap: Record<string, number> = {}
    const expectedHeaders = [
      'اسم البرنامج', 'القسم', 'المسؤول', 'الحالة', 'الأولوية',
      'التقدم', 'الشهر', 'السنة', 'ملاحظات'
    ]

    for (const expected of expectedHeaders) {
      const idx = header.findIndex(h => h === expected || h.includes(expected))
      if (idx === -1) {
        return NextResponse.json(
          { error: `عمود "${expected}" غير موجود في الملف` },
          { status: 400 }
        )
      }
      colMap[expected] = idx
    }

    // Fetch all departments and employees for mapping
    const departments = await db.department.findMany()
    const employees = await db.employee.findMany({
      include: { department: true }
    })

    const deptMap = new Map<string, string>()
    for (const dept of departments) {
      deptMap.set(dept.name, dept.id)
    }

    const empMap = new Map<string, string>()
    for (const emp of employees) {
      empMap.set(emp.name, emp.id)
    }

    // Validate statuses and priorities
    const validStatuses = ['لم تبدأ', 'قيد التنفيذ', 'مكتملة', 'ملغاة']
    const validPriorities = ['عاجلة', 'عالية', 'متوسطة', 'منخفضة']

    let imported = 0
    const errors: string[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.length === 0 || row.every(c => c === '')) continue

      const name = row[colMap['اسم البرنامج']] || ''
      if (!name) {
        errors.push(`صف ${i + 1}: اسم البرنامج فارغ`)
        continue
      }

      const deptName = row[colMap['القسم']] || ''
      const empName = row[colMap['المسؤول']] || ''
      const status = row[colMap['الحالة']] || 'لم تبدأ'
      const priority = row[colMap['الأولوية']] || 'متوسطة'
      const progressStr = row[colMap['التقدم']] || '0'
      const monthStr = row[colMap['الشهر']] || ''
      const yearStr = row[colMap['السنة']] || ''
      const notes = row[colMap['ملاحظات']] || ''

      // Validate status
      if (!validStatuses.includes(status)) {
        errors.push(`صف ${i + 1}: حالة "${status}" غير صالحة`)
        continue
      }

      // Validate priority
      if (!validPriorities.includes(priority)) {
        errors.push(`صف ${i + 1}: أولوية "${priority}" غير صالحة`)
        continue
      }

      // Parse month
      let month = 1
      const monthNum = parseInt(monthStr, 10)
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        month = monthNum
      } else {
        const monthIdx = MONTHS.findIndex(m => m === monthStr)
        if (monthIdx !== -1) {
          month = monthIdx + 1
        } else {
          errors.push(`صف ${i + 1}: شهر "${monthStr}" غير صالح`)
          continue
        }
      }

      // Parse year
      const year = parseInt(yearStr, 10)
      if (isNaN(year) || year < 2020 || year > 2030) {
        errors.push(`صف ${i + 1}: سنة "${yearStr}" غير صالحة`)
        continue
      }

      // Parse progress
      let progress = parseInt(progressStr, 10)
      if (isNaN(progress)) progress = 0
      progress = Math.max(0, Math.min(100, progress))

      // Map department
      let departmentId: string | null = null
      if (deptName) {
        departmentId = deptMap.get(deptName) || null
        if (!departmentId) {
          errors.push(`صف ${i + 1}: القسم "${deptName}" غير موجود`)
          continue
        }
      }

      // Map employee
      let employeeId: string | null = null
      if (empName) {
        employeeId = empMap.get(empName) || null
        if (!employeeId) {
          errors.push(`صف ${i + 1}: الموظف "${empName}" غير موجود`)
          continue
        }
      }

      // Create program
      try {
        await db.program.create({
          data: {
            name,
            departmentId,
            employeeId,
            status: status as 'لم تبدأ' | 'قيد التنفيذ' | 'مكتملة' | 'ملغاة',
            priority: priority as 'عاجلة' | 'عالية' | 'متوسطة' | 'منخفضة',
            progress,
            month,
            year,
            notes: notes || null,
            isFavorite: false,
          }
        })
        imported++
      } catch {
        errors.push(`صف ${i + 1}: خطأ أثناء حفظ البرنامج "${name}"`)
      }
    }

    return NextResponse.json({
      data: { imported, errors }
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء استيراد البيانات' }, { status: 500 })
  }
}
