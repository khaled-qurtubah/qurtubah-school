import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod/v4'

const employeeCreateSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  departmentId: z.string().nullable().optional(),
})

const employeeUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  departmentId: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { position: { contains: search } },
      ]
    }

    const employees = await db.employee.findMany({
      where,
      include: {
        department: true,
        _count: {
          select: {
            programs: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: employees })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = employeeCreateSchema.parse(body)

    const employee = await db.employee.create({
      data: {
        name: validated.name,
        position: validated.position,
        departmentId: validated.departmentId ?? null,
      },
      include: {
        department: true,
        _count: {
          select: {
            programs: true,
          },
        },
      },
    })

    return NextResponse.json({ data: employee }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = employeeUpdateSchema.parse(body)

    const { id, ...data } = validated

    const employee = await db.employee.update({
      where: { id },
      data: data as Parameters<typeof db.employee.update>[0]['data'],
      include: {
        department: true,
        _count: {
          select: {
            programs: true,
          },
        },
      },
    })

    return NextResponse.json({ data: employee })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = deleteSchema.parse(body)

    await db.employee.delete({
      where: { id: validated.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
