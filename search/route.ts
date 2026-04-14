import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        programs: [],
        employees: [],
        departments: [],
      })
    }

    const searchFilter = query.trim()

    const [programs, employees, departments] = await Promise.all([
      db.program.findMany({
        where: { name: { contains: searchFilter } },
        include: { department: true, employee: true },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      db.employee.findMany({
        where: {
          OR: [
            { name: { contains: searchFilter } },
            { position: { contains: searchFilter } },
          ],
        },
        include: { department: true },
        orderBy: { name: 'asc' },
        take: 10,
      }),
      db.department.findMany({
        where: { name: { contains: searchFilter } },
        include: {
          _count: { select: { programs: true, employees: true } },
        },
        orderBy: { name: 'asc' },
        take: 10,
      }),
    ])

    return NextResponse.json({
      programs,
      employees,
      departments,
    })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
