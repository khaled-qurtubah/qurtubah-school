import { NextRequest, NextResponse } from 'next/server'

interface ActivityEntry {
  id: string
  type: 'create' | 'update' | 'delete' | 'status_change' | 'favorite_toggle' | string
  programName: string
  programId: string
  employeeName?: string
  departmentName?: string
  entityType?: string
  details: string
  timestamp: string
}

const activityLog: ActivityEntry[] = []

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '30')
  const type = searchParams.get('type') || null
  const entityType = searchParams.get('entityType') || null

  let activities = activityLog
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Filter by type
  if (type) {
    activities = activities.filter((a) => a.type === type)
  }

  // Filter by entityType
  if (entityType) {
    activities = activities.filter((a) => a.entityType === entityType)
  }

  const filtered = activities.slice(0, limit)
  const total = activities.length

  // Count by type for filter pills
  const typeCounts: Record<string, number> = {
    create: activityLog.filter((a) => a.type === 'create').length,
    update: activityLog.filter((a) => a.type === 'update').length,
    delete: activityLog.filter((a) => a.type === 'delete').length,
  }

  return NextResponse.json({ data: filtered, total, typeCounts })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entry: ActivityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...body,
    }
    activityLog.push(entry)
    if (activityLog.length > 200) {
      activityLog.splice(0, activityLog.length - 200)
    }
    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
