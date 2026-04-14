import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    const where: Record<string, unknown> = {}
    if (year) where.year = parseInt(year, 10)

    const programs = await db.program.findMany({
      where,
      include: {
        department: true,
        employee: true,
      },
      orderBy: { month: 'asc' },
    })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx')

    // Build data rows
    const headers = [
      'الرقم',
      'اسم البرنامج',
      'القسم',
      'المسؤول',
      'المنصب',
      'الحالة',
      'الأولوية',
      'نسبة التقدم',
      'الشهر',
      'السنة',
      'تاريخ البدء',
      'تاريخ الانتهاء',
      'ملاحظات',
      'مفضلة',
    ]

    const rows = programs.map((p, i) => [
      i + 1,
      p.name,
      p.department?.name || '—',
      p.employee?.name || '—',
      p.position || '—',
      p.status,
      p.priority,
      p.progress,
      MONTHS[p.month - 1] || '—',
      p.year,
      p.startDate || '—',
      p.endDate || '—',
      p.notes || '',
      p.isFavorite ? 'نعم' : 'لا',
    ])

    const wsData = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // الرقم
      { wch: 35 },  // اسم البرنامج
      { wch: 20 },  // القسم
      { wch: 20 },  // المسؤول
      { wch: 20 },  // المنصب
      { wch: 12 },  // الحالة
      { wch: 12 },  // الأولوية
      { wch: 12 },  // نسبة التقدم
      { wch: 12 },  // الشهر
      { wch: 8 },   // السنة
      { wch: 14 },  // تاريخ البدء
      { wch: 14 },  // تاريخ الانتهاء
      { wch: 40 },  // ملاحظات
      { wch: 8 },   // مفضلة
    ]

    // RTL direction
    ws['!dir'] = 'rtl'

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'البرامج')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`برامج_قرطبة_${new Date().toISOString().split('T')[0]}.xlsx`)}`,
      },
    })
  } catch (error) {
    console.error('Error exporting Excel:', error)
    return NextResponse.json({ error: 'Failed to export Excel' }, { status: 500 })
  }
}
