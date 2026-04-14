'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTHS, STATUS_LIST, PRIORITY_LIST, STATUS_COLORS, PRIORITY_COLORS, getProgressColor, ITEMS_PER_PAGE } from '@/lib/constants'
import type { Program, Department, Employee, ProgramStatus, ProgramPriority } from '@/lib/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Copy,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  CheckSquare,
  Square,
  Keyboard,
  Calendar,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useProgramDetailStore } from '@/lib/program-detail-store'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'

interface ProgramForm {
  name: string
  departmentId: string
  employeeId: string
  status: ProgramStatus
  priority: ProgramPriority
  progress: number
  notes: string
  year: number
  month: number
}

const defaultForm: ProgramForm = {
  name: '',
  departmentId: '',
  employeeId: '',
  status: 'لم تبدأ',
  priority: 'متوسطة',
  progress: 0,
  notes: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
}

export default function ProgramsTab() {
  const { filters, setFilter, triggerUpdate, lastUpdated, showFavoritesOnly } = useAppStore()
  const openProgramDetail = useProgramDetailStore(s => s.open)
  const [programs, setPrograms] = useState<Program[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProgramForm>({ ...defaultForm })
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>('')
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false)

  // Keyboard status update state
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null)
  const [flashRowId, setFlashRowId] = useState<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  // Import state (Feature 1)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Overdue filter (Feature 2)
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)

  // Quick view preview (Feature 5)
  const [previewProgram, setPreviewProgram] = useState<Program | null>(null)
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 })
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Search input debounce
  const [searchInput, setSearchInput] = useState(filters.search)

  // Quick date presets
  const getCurrentQuarter = () => {
    const now = new Date()
    const month = now.getMonth() // 0-11
    const quarterStartMonth = Math.floor(month / 3) * 3 // 0, 3, 6, 9
    return quarterStartMonth + 1 // 1-based month
  }

  const currentMonth = new Date().getMonth() + 1
  const currentQuarterStart = getCurrentQuarter()
  const activePreset = filters.month === 0 ? 'all' : filters.month === currentMonth ? 'month' : (filters.month >= currentQuarterStart && filters.month < currentQuarterStart + 3) ? 'quarter' : 'custom'

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('year', String(filters.year))
      if (filters.month) params.set('month', String(filters.month))
      if (filters.departmentId) params.set('departmentId', filters.departmentId)
      if (filters.status) params.set('status', filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.search) params.set('search', filters.search)
      if (showFavoritesOnly) params.set('isFavorite', 'true')
      params.set('page', String(page))
      params.set('limit', String(ITEMS_PER_PAGE))

      const res = await fetch(`/api/programs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setPrograms(json.data || [])
        setTotalPages(json.pagination?.totalPages || 1)
        setTotal(json.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch programs:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, page, lastUpdated, showFavoritesOnly])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) {
        const json = await res.json()
        setDepartments(json.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const json = await res.json()
        setEmployees(json.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }, [])

  useEffect(() => {
    fetchDepartments()
    fetchEmployees()
  }, [fetchDepartments, fetchEmployees])

  useEffect(() => {
    setPage(1)
  }, [filters.year, filters.month, filters.departmentId, filters.status, filters.priority, filters.search])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter('search', searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, setFilter])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({
      ...defaultForm,
      year: filters.year,
      month: filters.month,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (program: Program) => {
    setEditingId(program.id)
    setForm({
      name: program.name,
      departmentId: program.departmentId || '',
      employeeId: program.employeeId || '',
      status: program.status,
      priority: program.priority,
      progress: program.progress,
      notes: program.notes || '',
      year: program.year,
      month: program.month,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم البرنامج')
      return
    }
    setSubmitting(true)
    try {
      const url = '/api/programs'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId
        ? { id: editingId, ...form, departmentId: form.departmentId === 'none' ? null : (form.departmentId || null), employeeId: form.employeeId === 'none' ? null : (form.employeeId || null) }
        : { ...form, departmentId: form.departmentId === 'none' ? null : (form.departmentId || null), employeeId: form.employeeId === 'none' ? null : (form.employeeId || null) }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(editingId ? 'تم تحديث البرنامج بنجاح' : 'تم إضافة البرنامج بنجاح')
        setDialogOpen(false)
        triggerUpdate()
        fetchPrograms()
      } else {
        const err = await res.json()
        toast.error(err.error || 'حدث خطأ')
      }
    } catch {
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleFavorite = async (program: Program) => {
    try {
      const res = await fetch('/api/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: program.id, isFavorite: !program.isFavorite }),
      })
      if (res.ok) {
        fetchPrograms()
        triggerUpdate()
      }
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/programs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      })
      if (res.ok) {
        toast.success('تم حذف البرنامج بنجاح')
        setDeleteId(null)
        triggerUpdate()
        fetchPrograms()
      } else {
        toast.error('حدث خطأ أثناء الحذف')
      }
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setDeleting(false)
    }
  }

  // Clear selection when page changes or filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filters.year, filters.month, filters.departmentId, filters.status, filters.priority, filters.search, page])

  // Keyboard shortcut for status changes (Feature 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedRowId || dialogOpen || deleteId || searchInput) return
      // Don't capture if user is typing in an input/select
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      const statusMap: Record<string, ProgramStatus> = {
        '1': 'لم تبدأ',
        '2': 'قيد التنفيذ',
        '3': 'مكتملة',
        '4': 'ملغاة',
      }

      const newStatus = statusMap[e.key]
      if (newStatus) {
        e.preventDefault()
        handleQuickStatusChange(focusedRowId, newStatus)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedRowId, dialogOpen, deleteId, searchInput, programs])

  const handleQuickStatusChange = async (programId: string, newStatus: ProgramStatus) => {
    const program = programs.find(p => p.id === programId)
    if (!program || program.status === newStatus) return

    try {
      const res = await fetch('/api/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: programId, status: newStatus }),
      })
      if (res.ok) {
        setFlashRowId(programId)
        setTimeout(() => setFlashRowId(null), 600)
        toast.success(`تم تغيير حالة "${program.name}" إلى "${newStatus}"`)
        fetchPrograms()
        triggerUpdate()
      } else {
        toast.error('فشل في تحديث الحالة')
      }
    } catch {
      toast.error('حدث خطأ')
    }
  }

  // Bulk operations (Feature 2)
  const allSelected = programs.length > 0 && programs.every(p => selectedIds.has(p.id))

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(programs.map(p => p.id)))
    }
  }

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkStatusChange = async () => {
    if (selectedIds.size === 0 || !bulkStatus) return
    setBulkStatusChanging(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch('/api/programs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: bulkStatus }),
        })
      )
      await Promise.all(promises)
      toast.success(`تم تغيير حالة ${selectedIds.size} برنامج إلى "${bulkStatus}"`)
      setSelectedIds(new Set())
      setBulkStatus('')
      setBulkStatusDialogOpen(false)
      triggerUpdate()
      fetchPrograms()
    } catch {
      toast.error('حدث خطأ أثناء التحديث')
    } finally {
      setBulkStatusChanging(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch('/api/programs', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
      )
      await Promise.all(promises)
      toast.success(`تم حذف ${selectedIds.size} برنامج بنجاح`)
      setSelectedIds(new Set())
      triggerUpdate()
      fetchPrograms()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    } finally {
      setBulkDeleting(false)
    }
  }

  // CSV Import handler (Feature 1)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast.error('يرجى اختيار ملف CSV')
      return
    }
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      if (res.ok) {
        const json = await res.json()
        const result = json.data || json
        if (result.imported > 0) {
          toast.success(`تم استيراد ${result.imported} برنامج بنجاح`)
        }
        if (result.errors && result.errors.length > 0) {
          toast.warning(`${result.errors.length} أخطاء أثناء الاستيراد`, { description: result.errors.slice(0, 3).join('، ') + (result.errors.length > 3 ? '...' : '') })
        }
        triggerUpdate()
        fetchPrograms()
      } else {
        const err = await res.json()
        toast.error(err.error || 'فشل في استيراد البيانات')
      }
    } catch {
      toast.error('حدث خطأ أثناء الاستيراد')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Preview card handlers (Feature 5)
  const handlePreviewEnter = (e: React.MouseEvent<HTMLParagraphElement>) => {
    const p = programs.find((pr) => pr.id === e.currentTarget.getAttribute('data-id'))
    if (!p) return
    previewTimerRef.current = setTimeout(() => {
      setPreviewProgram(p)
      const rect = e.currentTarget.getBoundingClientRect()
      setPreviewPos({ x: rect.left, y: rect.bottom + 8 })
    }, 500)
  }

  const handlePreviewLeave = () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    setPreviewProgram(null)
  }

  // Clone/duplicate a program using server-side clone API
  const handleClone = async (program: Program) => {
    try {
      const res = await fetch(`/api/programs?clone=${program.id}`, {
        method: 'POST',
      })
      if (res.ok) {
        toast.success('تم نسخ البرنامج بنجاح')
        triggerUpdate()
        fetchPrograms()
      } else {
        toast.error('فشل في نسخ البرنامج')
      }
    } catch {
      toast.error('حدث خطأ أثناء النسخ')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">البرامج</h2>
            <p className="text-sm text-muted-foreground">{total} برنامج</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              variant="outline"
              className="gap-2 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              استيراد
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
            <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="size-4" />
              إضافة برنامج
            </Button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث في البرامج..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-9 pl-9"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={(v) => setFilter('status', v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select
            value={filters.priority || 'all'}
            onValueChange={(v) => setFilter('priority', v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="الأولوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأولويات</SelectItem>
              {PRIORITY_LIST.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Overdue Filter Toggle (Feature 2) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
              showOverdueOnly
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <AlertCircle className="size-3" />
            المتأخرة فقط
          </button>
        </div>

        {/* Quick Date Filter Presets */}
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('month', 0)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                activePreset === 'all'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('month', currentMonth)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                activePreset === 'month'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => setFilter('month', currentQuarterStart)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                activePreset === 'quarter'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              الربع الحالي
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Keyboard className="size-3" />
        <span>اختصارات لوحة المفاتيح: اضغط على صف ثم استخدم</span>
        <div className="flex items-center gap-1">
          {STATUS_LIST.map((s, i) => (
            <Tooltip key={s}>
              <TooltipTrigger asChild>
                <kbd className="inline-flex items-center justify-center size-5 rounded border bg-muted text-[10px] font-mono">
                  {i + 1}
                </kbd>
              </TooltipTrigger>
              <TooltipContent side="top">{s}</TooltipContent>
            </Tooltip>
          ))}
          <span className="text-muted-foreground mr-1">لتغيير الحالة</span>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-sm relative gradient-border">
        <Table ref={tableRef}>
          <TableHeader className="sticky-table-header">
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleToggleSelectAll}
                  aria-label="تحديد الكل"
                />
              </TableHead>
              <TableHead className="text-center w-12">#</TableHead>
              <TableHead>البرنامج</TableHead>
              <TableHead className="hidden md:table-cell">القسم</TableHead>
              <TableHead className="hidden lg:table-cell">المسؤول</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="hidden sm:table-cell">الأولوية</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[120px]">التقدم</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-2 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-2">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Search className="size-6" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">لا توجد برامج</p>
                    <p className="text-xs text-muted-foreground/70">جرّب تغيير الفلاتر أو أضف برنامج جديد</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200"
                      onClick={handleOpenAdd}
                    >
                      <Plus className="size-4 ml-1" />
                      إضافة برنامج
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program, index) => {
                const statusColor = STATUS_COLORS[program.status]
                const priorityColor = PRIORITY_COLORS[program.priority]
                const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1
                const isSelected = selectedIds.has(program.id)
                const isFocused = focusedRowId === program.id
                const isFlashing = flashRowId === program.id

                // Overdue check (Feature 2)
                const isOverdue = program.month < currentMonth && program.status !== 'مكتملة' && program.status !== 'ملغاة'

                // Filter overdue if enabled
                if (showOverdueOnly && !isOverdue) return null

                return (
                  <TableRow
                    key={program.id}
                    className={`group cursor-pointer row-accent-hover transition-colors ${
                      isFocused ? 'ring-2 ring-emerald-500/50 ring-inset bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                    } ${
                      isSelected ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10'
                    } ${isFlashing ? 'animate-pulse bg-emerald-100 dark:bg-emerald-900/30' : ''} ${isOverdue ? 'border-r-4 border-r-red-400 dark:border-r-red-500' : ''}`}
                    onClick={() => { openProgramDetail(program.id); setFocusedRowId(program.id) }}
                    onFocus={() => setFocusedRowId(program.id)}
                    tabIndex={0}
                  >
                    <TableCell className="w-10 pl-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          setSelectedIds(prev => {
                            const next = new Set(prev)
                            if (next.has(program.id)) next.delete(program.id)
                            else next.add(program.id)
                            return next
                          })
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`تحديد ${program.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs font-mono">
                      {globalIndex}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFavorite(program)}
                          className="shrink-0 transition-transform hover:scale-110"
                          aria-label={program.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        >
                          {program.isFavorite ? (
                            <Star className="size-4 fill-amber-400 text-amber-400" />
                          ) : (
                            <StarOff className="size-4 text-muted-foreground/40 hover:text-muted-foreground" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p
                                  className="font-medium text-sm truncate cursor-help relative inline-flex items-center gap-1"
                                  onMouseEnter={handlePreviewEnter}
                                  onMouseLeave={handlePreviewLeave}
                                >
                                  {program.name}
                                  {isOverdue && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center justify-center size-4 rounded-full bg-red-500 text-white text-[10px] font-bold shrink-0" title="متأخر">
                                          !
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>متأخر</TooltipContent>
                                    </Tooltip>
                                  )}
                                </p>
                              </TooltipTrigger>
                              {program.notes && (
                                <TooltipContent side="bottom" className="max-w-[250px] text-xs leading-relaxed">
                                  <p className="text-muted-foreground">
                                    {program.notes.length > 100
                                      ? program.notes.slice(0, 100) + '...'
                                      : program.notes}
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          <p className="text-[11px] text-muted-foreground md:hidden">
                            {program.department?.name || '—'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {program.department && (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: program.department.color || '#94a3b8' }}
                          />
                          {program.department.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {program.employee?.name || program.position || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusColor?.bg} ${statusColor?.text} text-[11px] gap-1 h-6 border-0 badge-depth`}>
                        <span className={`size-1.5 rounded-full ${statusColor?.dot} badge-dot-pulse`} />
                        {program.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={`${priorityColor?.bg} ${priorityColor?.text} text-[11px] gap-1 h-6 border-0 badge-depth`}>
                        <span className={`size-1.5 rounded-full ${priorityColor?.dot} badge-dot-pulse`} />
                        {program.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 h-2 rounded-full overflow-hidden min-w-[60px] ${program.progress === 0 ? 'progress-bar-empty' : 'bg-muted'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${program.progress > 0 ? 'progress-bar-gradient' : ''}`}
                            style={{ width: `${program.progress}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-semibold min-w-[32px] text-right ${
                          program.progress >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                          : program.progress >= 50 ? 'text-blue-600 dark:text-blue-400'
                          : program.progress >= 25 ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                        }`}>
                          {program.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
                          onClick={() => handleOpenEdit(program)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => handleClone(program)}
                          title="نسخ البرنامج"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => setDeleteId(program.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              صفحة {page} من {totalPages} — <span className="font-medium text-foreground">{total}</span> برنامج
            </p>
            <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 hover:bg-white dark:hover:bg-gray-800 transition-colors duration-150"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
              {/* Page numbers */}
              {(() => {
                const pages: (number | '...')[] = []
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i)
                } else {
                  if (page <= 3) {
                    pages.push(1, 2, 3, 4, '...', totalPages)
                  } else if (page >= totalPages - 2) {
                    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                  } else {
                    pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
                  }
                }
                return pages.map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="px-1 text-muted-foreground text-xs">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'ghost'}
                      size="icon"
                      className={`size-7 text-xs transition-all duration-150 ${page === p ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25' : 'hover:bg-white dark:hover:bg-gray-800'}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )
              })()}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 hover:bg-white dark:hover:bg-gray-800 transition-colors duration-150"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Preview Card (Feature 5) */}
      <AnimatePresence>
        {previewProgram && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 surface-card shadow-lg rounded-xl p-4 w-72 pointer-events-none"
            style={{
              left: Math.min(previewPos.x, window.innerWidth - 300),
              top: Math.min(previewPos.y, window.innerHeight - 250),
            }}
            dir="rtl"
          >
            {/* Arrow pointer */}
            <div className="absolute -top-1.5 right-8 w-3 h-3 rotate-45 surface-card border-t border-r border-gray-200 dark:border-gray-700" />
            <p className="text-sm font-bold text-foreground mb-2 truncate">{previewProgram.name}</p>
            <div className="space-y-1.5 text-xs">
              {previewProgram.department && (
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: previewProgram.department.color }} />
                  <span className="text-muted-foreground">القسم:</span>
                  <span className="font-medium">{previewProgram.department.name}</span>
                </div>
              )}
              {previewProgram.employee && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">المسؤول:</span>
                  <span className="font-medium">{previewProgram.employee.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className={`${STATUS_COLORS[previewProgram.status]?.bg} ${STATUS_COLORS[previewProgram.status]?.text} text-[10px] h-5 border-0`}>
                  {previewProgram.status}
                </Badge>
                <Badge variant="outline" className={`${PRIORITY_COLORS[previewProgram.priority]?.bg} ${PRIORITY_COLORS[previewProgram.priority]?.text} text-[10px] h-5 border-0`}>
                  {previewProgram.priority}
                </Badge>
              </div>
              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">التقدم</span>
                  <span className={`font-semibold ${previewProgram.progress >= 80 ? 'text-emerald-600' : previewProgram.progress >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                    {previewProgram.progress}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${previewProgram.progress > 0 ? 'progress-bar-gradient' : ''}`}
                    style={{ width: `${previewProgram.progress}%` }}
                  />
                </div>
              </div>
              {previewProgram.notes && (
                <p className="text-muted-foreground mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 line-clamp-2 leading-relaxed">
                  {previewProgram.notes.length > 80 ? previewProgram.notes.slice(0, 80) + '...' : previewProgram.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto gradient-border">
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="text-lg font-bold gradient-text">{editingId ? 'تعديل البرنامج' : 'إضافة برنامج جديد'}</DialogTitle>
            <DialogDescription className="text-sm">
              {editingId ? 'قم بتعديل بيانات البرنامج' : 'أدخل بيانات البرنامج الجديد'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">اسم البرنامج *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="أدخل اسم البرنامج"
              />
            </div>

            {/* Department & Employee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">القسم</Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(v) => setForm({ ...form, departmentId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: d.color || '#94a3b8' }}
                          />
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">المسؤول</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm({ ...form, employeeId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر المسؤول" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مسؤول</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} — {e.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">الحالة</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as ProgramStatus })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">الأولوية</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as ProgramPriority })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LIST.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">نسبة التقدم ({form.progress}%)</Label>
              <Input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                className="h-2 p-0 border-0 focus-visible:ring-0 bg-muted cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Year & Month */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">السنة</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2030}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">الشهر</Label>
                <Select
                  value={String(form.month)}
                  onValueChange={(v) => setForm({ ...form, month: Number(v) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="أضف ملاحظات..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="transition-all duration-200">
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm shadow-emerald-600/25 transition-all duration-200 hover:shadow-md hover:shadow-emerald-600/30"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  {editingId ? 'تحديث' : 'إضافة'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-card border shadow-2xl border-emerald-200 dark:border-emerald-800/50"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-foreground">{selectedIds.size}</span>
              <span className="text-xs text-muted-foreground">محدد</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkStatusDialogOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Loader2 className="size-3" />
              تغيير الحالة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`هل أنت متأكد من حذف ${selectedIds.size} برنامج؟ لا يمكن التراجع عن هذا الإجراء.`)) {
                  handleBulkDelete()
                }
              }}
              disabled={bulkDeleting}
              className="gap-1.5 text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
            >
              {bulkDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              حذف ({selectedIds.size})
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="gap-1.5 text-xs h-8 text-muted-foreground"
            >
              <X className="size-3" />
              إلغاء التحديد
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير حالة البرامج المحددة</DialogTitle>
            <DialogDescription>
              سيتم تغيير حالة {selectedIds.size} برنامج إلى الحالة المحددة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {STATUS_LIST.map((s) => (
              <button
                key={s}
                onClick={() => setBulkStatus(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-colors text-right ${
                  bulkStatus === s
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <span className={`size-1.5 rounded-full ${STATUS_COLORS[s]?.dot}`} />
                <span className="flex-1 font-medium">{s}</span>
                {bulkStatus === s && (
                  <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)} disabled={bulkStatusChanging}>
              إلغاء
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus || bulkStatusChanging}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {bulkStatusChanging ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                'تطبيق التغيير'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">حذف البرنامج</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا البرنامج؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  حذف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
