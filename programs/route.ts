import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod/v4'

const programCreateSchema = z.object({
  name: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  status: z.enum(['لم تبدأ', 'قيد التنفيذ', 'مكتملة', 'ملغاة']).optional(),
  priority: z.enum(['عاجلة', 'عالية', 'متوسطة', 'منخفضة']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
  isFavorite: z.boolean().optional(),
})

const programUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  departmentId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  status: z.enum(['لم تبدأ', 'قيد التنفيذ', 'مكتملة', 'ملغاة']).optional(),
  priority: z.enum(['عاجلة', 'عالية', 'متوسطة', 'منخفضة']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
  isFavorite: z.boolean().optional(),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const isFavorite = searchParams.get('isFavorite')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: Record<string, unknown> = {}

    if (year) where.year = parseInt(year, 10)
    if (month) where.month = parseInt(month, 10)
    if (departmentId) where.departmentId = departmentId
    if (status) where.status = status
    if (priority) where.priority = priority
    if (isFavorite === 'true') where.isFavorite = true
    if (search) {
      where.name = { contains: search }
    }

    const skip = (page - 1) * limit

    const [programs, total] = await Promise.all([
      db.program.findMany({
        where,
        include: {
          department: true,
          employee: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.program.count({ where }),
    ])

    return NextResponse.json({
      data: programs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Clone mode: ?clone=<programId>
    const { searchParams } = new URL(request.url)
    const cloneId = searchParams.get('clone')

    if (cloneId) {
      const original = await db.program.findUnique({
        where: { id: cloneId },
        include: { department: true, employee: true },
      })
      if (!original) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 })
      }

      const cloned = await db.program.create({
        data: {
          name: `${original.name} (نسخة)`,
          departmentId: original.departmentId,
          employeeId: original.employeeId,
          position: original.position,
          status: original.status,
          priority: original.priority,
          progress: 0,
          startDate: original.startDate,
          endDate: original.endDate,
          notes: original.notes,
          year: original.year,
          month: original.month,
          isFavorite: false,
        },
        include: {
          department: true,
          employee: true,
        },
      })

      return NextResponse.json({ data: cloned }, { status: 201 })
    }

    const body = await request.json()
    const validated = programCreateSchema.parse(body)

    const program = await db.program.create({
      data: {
        name: validated.name,
        departmentId: validated.departmentId ?? null,
        employeeId: validated.employeeId ?? null,
        position: validated.position ?? null,
        status: validated.status ?? 'لم تبدأ',
        priority: validated.priority ?? 'متوسطة',
        progress: validated.progress ?? 0,
        startDate: validated.startDate ?? null,
        endDate: validated.endDate ?? null,
        notes: validated.notes ?? null,
        year: validated.year ?? 2025,
        month: validated.month ?? 1,
        isFavorite: validated.isFavorite ?? false,
      },
      include: {
        department: true,
        employee: true,
      },
    })

    return NextResponse.json({ data: program }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error creating program:', error)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = programUpdateSchema.parse(body)

    const { id, ...data } = validated

    const program = await db.program.update({
      where: { id },
      data: data as Parameters<typeof db.program.update>[0]['data'],
      include: {
        department: true,
        employee: true,
      },
    })

    return NextResponse.json({ data: program })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error updating program:', error)
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = deleteSchema.parse(body)

    await db.program.delete({
      where: { id: validated.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error deleting program:', error)
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 })
  }
}
