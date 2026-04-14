'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTHS, TABS, STATUS_LIST, PRIORITY_LIST } from '@/lib/constants'
import type { TabId, Department } from '@/lib/types'
import {
  Calendar, List, Clock, Users, Building2, Target,
  BarChart3, FileText, RefreshCw, Sun, Moon,
  Download, Upload, Database, ChevronDown, Menu,
  BarChart, UserCheck, Star
} from 'lucide-react'
import NotificationsPanel from '@/components/NotificationsPanel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'


const iconMap: Record<string, React.ElementType> = {
  Calendar, List, Clock, Users, Building2, Target, BarChart3, FileText
}

interface HeaderProps {
  departments: Department[]
  onUpdate: () => void
  onExportCSV: () => void
  onExportPDF: () => void
  onExportExcel: () => void
  onBackup: () => void
  onRestore: (data: string) => void
}

export default function Header({
  departments, onUpdate, onExportCSV, onExportPDF, onExportExcel, onBackup, onRestore
}: HeaderProps) {
  const { filters, setFilter } = useAppStore()
  const [currentTime, setCurrentTime] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { theme, setTheme } = useTheme()
  const activeTab = useAppStore(s => s.activeTab)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const showFavoritesOnly = useAppStore(s => s.showFavoritesOnly)
  const toggleShowFavorites = useAppStore(s => s.toggleShowFavorites)

  // Mini stats state
  const [miniStats, setMiniStats] = useState({
    totalPrograms: 0,
    completionRate: 0,
    activeEmployees: 0,
  })

  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      try {
        const res = await fetch(`/api/stats?year=${filters.year}`)
        if (res.ok && !cancelled) {
          const json = await res.json()
          const data = json.data || {}
          const total = data.total || 0
          const completed = data.completed || 0
          const rate = total > 0 ? Math.round((completed / total) * 100) : 0

          // Count unique active employees
          const employees = new Set<string>()
          if (data.employeePerformance) {
            for (const emp of data.employeePerformance) {
              if (emp.totalPrograms > 0) employees.add(emp.id)
            }
          }

          setMiniStats({
            totalPrograms: total,
            completionRate: rate,
            activeEmployees: employees.size,
          })
        }
      } catch {
        // silent
      }
    }
    loadStats()
    return () => { cancelled = true }
  }, [filters.year])

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleDateString('ar-SA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }) + ' - ' + now.toLocaleTimeString('ar-SA'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleRestore = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        onRestore(ev.target?.result as string)
      }
      reader.readAsText(file)
    }
    input.click()
  }, [onRestore])

  return (
    <header className={`sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-emerald-900/5 dark:shadow-emerald-900/20' : 'shadow-sm'} bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-950/90 border-b border-gray-200/80 dark:border-gray-800/80 backdrop-blur-sm`}>
      {/* Emerald accent bar with animated gradient */}
      <div className="h-1 animate-gradient-x" style={{ background: 'linear-gradient(90deg, #34d399, #2dd4bf, #14b8a6, #34d399)', backgroundSize: '200% 100%' }} />
      {/* الشريط العلوي */}
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* الشعار والعنوان */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo-school.png"
              alt="مدارس قرطبة"
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-contain flex-shrink-0 bg-white"
            />
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">
                مدارس قرطبة الأهلية
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                نظام إدارة البرامج والأنشطة المدرسية
              </p>
            </div>
          </div>

          {/* الفلاتر */}
          <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            <select
              value={filters.year}
              onChange={e => setFilter('year', parseInt(e.target.value))}
              className="h-8 px-3 text-sm filter-select"
            >
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={filters.month}
              onChange={e => setFilter('month', parseInt(e.target.value))}
              className="h-8 px-3 text-sm filter-select"
            >
              <option value={0}>كل الأشهر</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={filters.departmentId || ''}
              onChange={e => setFilter('departmentId', e.target.value || null)}
              className="h-8 px-3 text-sm filter-select"
            >
              <option value="">كل الأقسام</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={filters.status || ''}
              onChange={e => setFilter('status', e.target.value || null)}
              className="h-8 px-3 text-sm filter-select"
            >
              <option value="">كل الحالات</option>
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filters.priority || ''}
              onChange={e => setFilter('priority', e.target.value || null)}
              className="h-8 px-3 text-sm filter-select"
            >
              <option value="">كل الأولويات</option>
              {PRIORITY_LIST.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShowFavorites}
              className={`h-8 w-8 transition-all duration-200 ${showFavoritesOnly ? 'text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] bg-amber-50 dark:bg-amber-950/30' : 'text-muted-foreground hover:text-amber-400'}`}
              title={showFavoritesOnly ? 'عرض جميع البرامج' : 'عرض المفضلة فقط'}
            >
              <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-amber-500' : ''}`} />
            </Button>
          </div>

          {/* الإجراءات */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark')
                setSpinning(true)
                if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
                spinTimeoutRef.current = setTimeout(() => setSpinning(false), 400)
              }}
            >
              {!mounted ? (
                <div className="h-4 w-4" />
              ) : theme === 'dark' ? (
                <Sun className={`h-4 w-4 ${spinning ? 'theme-toggle-spin' : ''}`} />
              ) : (
                <Moon className={`h-4 w-4 ${spinning ? 'theme-toggle-spin-reverse' : ''}`} />
              )}
            </Button>
            <NotificationsPanel />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUpdate}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={onExportCSV}>
                  <Download className="h-4 w-4 ml-2" />
                  <span>تصدير CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPDF}>
                  <FileText className="h-4 w-4 ml-2" />
                  <span>تصدير PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportExcel}>
                  <BarChart3 className="h-4 w-4 ml-2" />
                  <span>تصدير Excel</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onBackup}>
                  <Database className="h-4 w-4 ml-2" />
                  <span>نسخ احتياطي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRestore}>
                  <Upload className="h-4 w-4 ml-2" />
                  <span>استعادة</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* قائمة الموبايل */}
        <div className={`lg:hidden overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] ${showMobileMenu ? 'max-h-48 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <div className={`p-3 mobile-menu-panel space-y-2 border-t-0`}> 
              <div className="flex gap-2">
                <select
                  value={filters.year}
                  onChange={e => setFilter('year', parseInt(e.target.value))}
                  className="flex-1 h-8 px-3 text-sm filter-select"
                >
                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={filters.month}
                  onChange={e => setFilter('month', parseInt(e.target.value))}
                  className="flex-1 h-8 px-3 text-sm filter-select"
                >
                  <option value={0}>كل الأشهر</option>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <select
                value={filters.departmentId || ''}
                onChange={e => setFilter('departmentId', e.target.value || null)}
                className="w-full h-8 px-3 text-sm filter-select"
              >
                <option value="">كل الأقسام</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <select
                  value={filters.status || ''}
                  onChange={e => setFilter('status', e.target.value || null)}
                  className="flex-1 h-8 px-3 text-sm filter-select"
                >
                  <option value="">كل الحالات</option>
                  {STATUS_LIST.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={filters.priority || ''}
                  onChange={e => setFilter('priority', e.target.value || null)}
                  className="flex-1 h-8 px-3 text-sm filter-select"
                >
                  <option value="">كل الأولويات</option>
                  {PRIORITY_LIST.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        {/* الوقت والتاريخ */}
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 truncate">
          {currentTime}
        </div>

        {/* Mini Statistics Bar - Desktop Only */}
        <div className="hidden xl:flex items-center gap-6 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart className="size-3 text-emerald-500" />
            <span>{miniStats.totalPrograms}</span>
            <span>برنامج</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="size-2 rounded-full bg-emerald-500" />
            <span>{miniStats.completionRate}%</span>
            <span>إنجاز</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCheck className="size-3 text-teal-500" />
            <span>{miniStats.activeEmployees}</span>
            <span>موظف نشط</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5">
            <kbd className="kbd-hint">Ctrl+K</kbd>
            <span className="text-[10px] text-muted-foreground/70">بحث</span>
          </div>
        </div>
      </div>

      {/* شريط التبويبات */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <nav className="flex overflow-x-auto px-4 lg:px-6 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = iconMap[tab.icon]
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-250 ease-out " +
                  (isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300")
                }
              >
                {/* Active indicator: emerald bottom bar + right accent */}
                {isActive && (
                  <>
                    <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" />
                    <span className="absolute right-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full" />
                  </>
                )}
                {Icon && <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />}
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && tab.id === 'programs' && miniStats.totalPrograms > 0 && (
                  <span className="tab-count-badge">{miniStats.totalPrograms}</span>
                )}
                {isActive && tab.id === 'statistics' && miniStats.completionRate > 0 && (
                  <span className="tab-count-badge">{miniStats.completionRate}%</span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
