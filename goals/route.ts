import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod/v4'

const goalCreateSchema = z.object({
  title: z.string().min(1),
  target: z.number().int().min(0).optional(),
  achieved: z.number().int().min(0).optional(),
  category: z.string().optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
})

const goalUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  target: z.number().int().min(0).optional(),
  achieved: z.number().int().min(0).optional(),
  category: z.string().optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = {}
    if (year) where.year = parseInt(year, 10)
    if (month) where.month = parseInt(month, 10)
    if (category && category !== 'all') where.category = category

    const goals = await db.goal.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    })

    return NextResponse.json({ data: goals })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = goalCreateSchema.parse(body)

    const goal = await db.goal.create({
      data: {
        title: validated.title,
        target: validated.target ?? 100,
        achieved: validated.achieved ?? 0,
        category: validated.category ?? 'general',
        year: validated.year ?? 2025,
        month: validated.month ?? 1,
      },
    })

    return NextResponse.json({ data: goal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = goalUpdateSchema.parse(body)

    const { id, ...data } = validated

    const goal = await db.goal.update({
      where: { id },
      data: data as Parameters<typeof db.goal.update>[0]['data'],
    })

    return NextResponse.json({ data: goal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = deleteSchema.parse(body)

    await db.goal.delete({
      where: { id: validated.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
