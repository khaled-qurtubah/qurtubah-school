'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useProgramDetailStore } from '@/lib/program-detail-store'
import { toast } from 'sonner'
import type { Department } from '@/lib/types'
import Header from '@/components/Header'
import ErrorBoundary from '@/components/ErrorBoundary'
import ProgramDetailSheet from '@/components/ProgramDetailSheet'
import ActivityPanel from '@/components/ActivityPanel'
import DashboardWidget, { ShowDashboardWidgetButton } from '@/components/DashboardWidget'
import { Instagram, Twitter, Phone, Mail } from 'lucide-react'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import SearchDialog from '@/components/SearchDialog'
import WelcomeBanner from '@/components/WelcomeBanner'
import CalendarTab from '@/components/CalendarTab'
import ProgramsTab from '@/components/ProgramsTab'
import TimelineTab from '@/components/TimelineTab'
import EmployeesTab from '@/components/EmployeesTab'
import DepartmentsTab from '@/components/DepartmentsTab'
import GoalsTab from '@/components/GoalsTab'
import StatisticsTab from '@/components/StatisticsTab'
import ReportsTab from '@/components/ReportsTab'
import ScrollToTop from '@/components/ScrollToTop'
import ScrollProgress from '@/components/ScrollProgress'
import MobileTabBar from '@/components/MobileTabBar'

export default function Home() {
  const { activeTab, lastUpdated, triggerUpdate } = useAppStore()
  const { programId, isOpen, close: closeDetail } = useProgramDetailStore()
  const [departments, setDepartments] = useState<Department[]>([])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) {
        const data = await res.json()
        setDepartments(data.data || data)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    const load = async () => { await fetchDepartments() }
    load()
  }, [fetchDepartments, lastUpdated])

  const handleExportCSV = useCallback(async () => {
    try {
      const res = await fetch('/api/programs?limit=9999')
      if (!res.ok) return
      const json = await res.json()
      const programs = json.data || []
      const headers = ['الرقم', 'البرنامج', 'القسم', 'المسؤول', 'الحالة', 'الأولوية', 'التقدم', 'الشهر']
      const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      const rows = programs.map((p: Record<string, unknown>, i: number) => {
        const dept = p.department as Record<string, string> | null
        const emp = p.employee as Record<string, string> | null
        return [i + 1, p.name, dept?.name || '-', emp?.name || '-', p.status, p.priority, p.progress + '%', MONTHS[(p.month as number) - 1] || '-']
      })
      const BOM = '\uFEFF'
      const csv = BOM + [headers.join(','), ...rows.map((r: unknown[]) => r.map((c: unknown) => `"${c}"`).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `برامج_قرطبة_${new Date().toLocaleDateString('ar-SA')}.csv`
      link.click()
      toast.success('تم تصدير الملف بنجاح')
    } catch {
      toast.error('خطأ في تصدير الملف')
    }
  }, [])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  const handleExportExcel = useCallback(async () => {
    try {
      const res = await fetch(`/api/export?year=${useAppStore.getState().filters.year}`)
      if (!res.ok) {
        toast.error('خطأ في تصدير الملف')
        return
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `برامج_قرطبة_${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('تم تصدير ملف Excel بنجاح')
    } catch {
      toast.error('خطأ في تصدير الملف')
    }
  }, [])

  const handleBackup = useCallback(async () => {
    try {
      const res = await fetch('/api/backup')
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `نسخة_احتياطية_قرطبة_${new Date().toISOString().split('T')[0]}.json`
        link.click()
        toast.success('تم إنشاء النسخة الاحتياطية بنجاح')
      }
    } catch {
      toast.error('خطأ في إنشاء النسخة الاحتياطية')
    }
  }, [])

  const handleRestore = useCallback(async (data: string) => {
    if (!confirm('هل أنت متأكد من استعادة البيانات؟ سيتم استبدال جميع البيانات الحالية.')) return
    try {
      const backupData = JSON.parse(data)
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      })
      if (res.ok) {
        toast.success('تمت استعادة البيانات بنجاح')
        triggerUpdate()
        fetchDepartments()
      } else {
        toast.error('خطأ في استعادة البيانات')
      }
    } catch {
      toast.error('ملف غير صالح')
    }
  }, [triggerUpdate, fetchDepartments])

  const handleUpdate = useCallback(() => {
    triggerUpdate()
    toast.success('تم تحديث البيانات')
  }, [triggerUpdate])

  const renderTab = () => {
    switch (activeTab) {
      case 'calendar': return <CalendarTab />
      case 'programs': return <ProgramsTab />
      case 'timeline': return <TimelineTab />
      case 'employees': return <EmployeesTab />
      case 'departments': return <DepartmentsTab />
      case 'goals': return <GoalsTab />
      case 'statistics': return <StatisticsTab />
      case 'reports': return <ReportsTab />
      default: return <CalendarTab />
    }
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col bg-subtle bg-noise page-enter">
      <ScrollProgress />
      <Header
        departments={departments}
        onUpdate={handleUpdate}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onBackup={handleBackup}
        onRestore={handleRestore}
      />

      <main className="flex-1 p-4 lg:p-6 max-w-[1400px] mx-auto w-full">
        <DashboardWidget />
        <ShowDashboardWidgetButton />
        <div key={activeTab} className="tab-content-enter">
          {renderTab()}
        </div>

        {/* Activity Panel - show below tabs */}
        <div className="mt-6">
          <ActivityPanel />
        </div>
      </main>

      <MobileTabBar />

      <footer className="glass-footer mt-auto no-print">
        <div className="h-1 animate-gradient-x" style={{ background: 'linear-gradient(90deg, #34d399, #2dd4bf, #14b8a6, #34d399)', backgroundSize: '200% 100%' }} />
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo-school.png" alt="الشعار" className="w-10 h-10 rounded-full shadow-md border border-white/50 dark:border-gray-700/50 dark-glow-active" />
              <div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  مدارس قرطبة الأهلية
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  © {new Date().getFullYear()} جميع الحقوق محفوظة
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center text-balance max-w-xs">
              نسعى لبناء جيل متميز · نظام إدارة البرامج والأنشطة المدرسية
            </p>
            <div className="flex items-center gap-2.5">
              {[
                { Icon: Phone, label: 'الهاتف' },
                { Icon: Mail, label: 'البريد' },
                { Icon: Twitter, label: 'تويتر' },
                { Icon: Instagram, label: 'انستقرام' },
              ].map(({ Icon, label }) => (
                <span
                  key={label}
                  className="social-icon inline-flex items-center justify-center h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer border border-emerald-100/50 dark:border-emerald-800/30"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <ScrollToTop />

      {/* Global overlays */}
      <KeyboardShortcuts />
      <SearchDialog />
      <ProgramDetailSheet
        programId={programId}
        isOpen={isOpen}
        onClose={closeDetail}
      />
    </div>
    </ErrorBoundary>
  )
}
