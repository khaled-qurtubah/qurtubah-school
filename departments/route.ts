import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod/v4'

const departmentCreateSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  order: z.number().int().optional(),
})

const departmentUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  order: z.number().int().optional(),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

export async function GET() {
  try {
    const departments = await db.department.findMany({
      include: {
        _count: {
          select: {
            programs: true,
            employees: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ data: departments })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = departmentCreateSchema.parse(body)

    const department = await db.department.create({
      data: {
        name: validated.name,
        color: validated.color,
        order: validated.order ?? 0,
      },
    })

    return NextResponse.json({ data: department }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error creating department:', error)
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = departmentUpdateSchema.parse(body)

    const { id, ...data } = validated

    const department = await db.department.update({
      where: { id },
      data: data as Parameters<typeof db.department.update>[0]['data'],
    })

    return NextResponse.json({ data: department })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error updating department:', error)
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = deleteSchema.parse(body)

    await db.department.delete({
      where: { id: validated.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error deleting department:', error)
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  }
}
