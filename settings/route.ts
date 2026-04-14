import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod/v4'

const settingCreateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

const settingUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      orderBy: { key: 'asc' },
    })

    const keyValueMap: Record<string, string> = {}
    for (const setting of settings) {
      keyValueMap[setting.key] = setting.value
    }

    return NextResponse.json({ data: keyValueMap, raw: settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = settingCreateSchema.parse(body)

    const setting = await db.setting.create({
      data: {
        key: validated.key,
        value: validated.value,
      },
    })

    return NextResponse.json({ data: setting }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error creating setting:', error)
    return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = settingUpdateSchema.parse(body)

    const setting = await db.setting.upsert({
      where: { key: validated.key },
      update: { value: validated.value },
      create: { key: validated.key, value: validated.value },
    })

    return NextResponse.json({ data: setting })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error updating setting:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}
