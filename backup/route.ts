import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod/v4'

const backupImportSchema = z.object({
  departments: z.array(z.object({
    name: z.string(),
    color: z.string(),
    order: z.number().optional(),
  })),
  employees: z.array(z.object({
    name: z.string(),
    position: z.string(),
    departmentId: z.string().nullable().optional(),
  })),
  programs: z.array(z.object({
    name: z.string(),
    departmentId: z.string().nullable().optional(),
    employeeId: z.string().nullable().optional(),
    position: z.string().nullable().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    progress: z.number().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    year: z.number().optional(),
    month: z.number().optional(),
    isFavorite: z.boolean().optional(),
  })),
  settings: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })),
  goals: z.array(z.object({
    title: z.string(),
    target: z.number().optional(),
    achieved: z.number().optional(),
    year: z.number().optional(),
    month: z.number().optional(),
  })),
})

export async function GET() {
  try {
    const [departments, employees, programs, settings, goals] = await Promise.all([
      db.department.findMany({ orderBy: { order: 'asc' } }),
      db.employee.findMany(),
      db.program.findMany({ include: { department: true, employee: true } }),
      db.setting.findMany(),
      db.goal.findMany(),
    ])

    const backupData = {
      departments,
      employees,
      programs,
      settings,
      goals,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    }

    return NextResponse.json({ data: backupData })
  } catch (error) {
    console.error('Error exporting backup:', error)
    return NextResponse.json({ error: 'Failed to export backup' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = backupImportSchema.parse(body)

    // Use a transaction to ensure data integrity
    await db.$transaction(async (tx) => {
      // Delete existing data in reverse dependency order
      await tx.program.deleteMany()
      await tx.goal.deleteMany()
      await tx.employee.deleteMany()
      await tx.department.deleteMany()
      await tx.setting.deleteMany()

      // Create departments and build ID mapping
      const oldDeptIdToNew: Record<string, string> = {}
      for (const dept of validated.departments) {
        const created = await tx.department.create({
          data: {
            name: dept.name,
            color: dept.color,
            order: dept.order ?? 0,
          },
        })
        oldDeptIdToNew[created.name] = created.id
      }

      // Create employees and build ID mapping
      const oldEmpIdToNew: Record<string, string> = {}
      for (const emp of validated.employees) {
        const created = await tx.employee.create({
          data: {
            name: emp.name,
            position: emp.position,
            departmentId: emp.departmentId ?? null,
          },
        })
        // Map by name since backup doesn't have original IDs
        oldEmpIdToNew[created.name] = created.id
      }

      // Create settings
      for (const setting of validated.settings) {
        await tx.setting.create({
          data: {
            key: setting.key,
            value: setting.value,
          },
        })
      }

      // Create goals
      for (const goal of validated.goals) {
        await tx.goal.create({
          data: {
            title: goal.title,
            target: goal.target ?? 100,
            achieved: goal.achieved ?? 0,
            year: goal.year ?? 2025,
            month: goal.month ?? 1,
          },
        })
      }

      // Create programs
      for (const prog of validated.programs) {
        await tx.program.create({
          data: {
            name: prog.name,
            departmentId: prog.departmentId ?? null,
            employeeId: prog.employeeId ?? null,
            position: prog.position ?? null,
            status: prog.status ?? 'لم تبدأ',
            priority: prog.priority ?? 'متوسطة',
            progress: prog.progress ?? 0,
            startDate: prog.startDate ?? null,
            endDate: prog.endDate ?? null,
            notes: prog.notes ?? null,
            year: prog.year ?? 2025,
            month: prog.month ?? 1,
            isFavorite: prog.isFavorite ?? false,
          },
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Backup restored successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error importing backup:', error)
    return NextResponse.json({ error: 'Failed to import backup' }, { status: 500 })
  }
}
