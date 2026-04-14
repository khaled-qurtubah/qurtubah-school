'use client'

import { useEffect, useState } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Trash2, Star, StarOff, CalendarDays, Building2, User,
  BarChart3, MessageSquare, Clock, Save, Pencil, X
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { MONTHS, STATUS_COLORS, PRIORITY_COLORS, getProgressColor } from '@/lib/constants'
import type { Program } from '@/lib/types'

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`
  if (diffHr < 24) return `منذ ${diffHr} ساعة`
  if (diffDay < 7) return `منذ ${diffDay} يوم`
  return date.toLocaleDateString('ar-SA')
}

interface ProgramDetailSheetProps {
  programId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function ProgramDetailSheet({ programId, isOpen, onClose }: ProgramDetailSheetProps) {
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const { triggerUpdate } = useAppStore()

  // Notes editing state
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (!programId || !isOpen) {
      setProgram(null)
      setEditingNotes(false)
      return
    }

    async function fetchProgram() {
      setLoading(true)
      try {
        const res = await fetch(`/api/programs?id=${programId}`)
        if (res.ok) {
          const json = await res.json()
          const data = json.data || []
          const p = Array.isArray(data) ? data[0] || null : data
          setProgram(p)
          if (p) setNotesDraft(p.notes || '')
        }
      } catch {
        setProgram(null)
      } finally {
        setLoading(false)
      }
    }
    fetchProgram()
  }, [programId, isOpen])

  const handleToggleFavorite = async () => {
    if (!program) return
    try {
      const res = await fetch('/api/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: program.id, isFavorite: !program.isFavorite }),
      })
      if (res.ok) {
        setProgram({ ...program, isFavorite: !program.isFavorite })
        triggerUpdate()
        toast.success(program.isFavorite ? 'تم إزالة من المفضلة' : 'تم إضافة للمفضلة')
      }
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const handleDelete = async () => {
    if (!program) return
    if (!confirm(`هل أنت متأكد من حذف "${program.name}"؟`)) return
    try {
      const res = await fetch('/api/programs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: program.id }),
      })
      if (res.ok) {
        toast.success('تم حذف البرنامج')
        onClose()
        triggerUpdate()
      }
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleStartEditNotes = () => {
    if (program) {
      setNotesDraft(program.notes || '')
      setEditingNotes(true)
    }
  }

  const handleCancelEditNotes = () => {
    setNotesDraft(program?.notes || '')
    setEditingNotes(false)
  }

  const handleSaveNotes = async () => {
    if (!program) return
    setSavingNotes(true)
    try {
      const res = await fetch('/api/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: program.id, notes: notesDraft || null }),
      })
      if (res.ok) {
        setProgram({ ...program, notes: notesDraft || null })
        setEditingNotes(false)
        triggerUpdate()
        toast.success('تم حفظ الملاحظات بنجاح')
      } else {
        toast.error('فشل في حفظ الملاحظات')
      }
    } catch {
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setSavingNotes(false)
    }
  }

  const statusColor = program ? (STATUS_COLORS[program.status] || STATUS_COLORS['لم تبدأ']) : null
  const priorityColor = program ? (PRIORITY_COLORS[program.priority] || PRIORITY_COLORS['متوسطة']) : null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-right mb-4">
          <SheetTitle className="text-right">تفاصيل البرنامج</SheetTitle>
          <SheetDescription className="text-right">
            عرض معلومات البرنامج بالكامل
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        ) : !program ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">لم يتم العثور على البرنامج</p>
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Program Name */}
            <div>
              <h3 className="text-lg font-bold text-foreground leading-relaxed">{program.name}</h3>
              {program.position && (
                <p className="text-sm text-muted-foreground mt-1">{program.position}</p>
              )}
            </div>

            {/* Status & Priority badges */}
            <div className="flex flex-wrap gap-2">
              {statusColor && (
                <Badge variant="outline" className={`${statusColor.bg} ${statusColor.text} border-0 text-xs gap-1.5 px-3 py-1`}>
                  <span className={`size-1.5 rounded-full ${statusColor.dot}`} />
                  {program.status}
                </Badge>
              )}
              {priorityColor && (
                <Badge variant="outline" className={`${priorityColor.bg} ${priorityColor.text} border-0 text-xs gap-1.5 px-3 py-1`}>
                  <span className={`size-1.5 rounded-full ${priorityColor.dot}`} />
                  {program.priority}
                </Badge>
              )}
              {program.isFavorite && (
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-0 text-xs px-3 py-1">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  مفضلة
                </Badge>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="size-4" />
                  نسبة التقدم
                </span>
                <span className={`font-bold text-lg ${
                  program.progress >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                  : program.progress >= 50 ? 'text-blue-600 dark:text-blue-400'
                  : program.progress >= 25 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
                }`}>
                  {program.progress}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getProgressColor(program.progress)}`}
                  style={{ width: `${program.progress}%` }}
                />
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="space-y-3">
              {/* Department */}
              {program.department && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div
                    className="flex size-9 items-center justify-center rounded-lg text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: program.department.color || '#6b7280' }}
                  >
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">القسم</p>
                    <p className="text-sm font-medium text-foreground truncate">{program.department.name}</p>
                  </div>
                </div>
              )}

              {/* Employee */}
              {program.employee && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                    <User className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">المسؤول</p>
                    <p className="text-sm font-medium text-foreground truncate">{program.employee.name}</p>
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <CalendarDays className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">الشهر / السنة</p>
                  <p className="text-sm font-medium text-foreground">{MONTHS[program.month - 1]} {program.year}</p>
                </div>
              </div>
            </div>

            {/* Notes - Always visible with edit capability */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-4" />
                  ملاحظات
                </p>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditNotes}
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3" />
                    تعديل
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="أضف ملاحظات..."
                    rows={4}
                    className="text-sm leading-relaxed resize-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditNotes}
                      disabled={savingNotes}
                      className="h-8 px-3 text-xs gap-1"
                    >
                      <X className="size-3" />
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="h-8 px-3 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {savingNotes ? (
                        <span className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="size-3" />
                      )}
                      حفظ
                    </Button>
                  </div>
                </div>
              ) : program.notes ? (
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border">
                  {program.notes}
                </p>
              ) : (
                <button
                  onClick={handleStartEditNotes}
                  className="w-full text-sm text-muted-foreground hover:text-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-dashed hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors text-center"
                >
                  <MessageSquare className="size-4 mx-auto mb-1 text-muted-foreground/50" />
                  إضافة ملاحظات...
                </button>
              )}
            </div>

            {/* Timestamps */}
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {relativeTime(program.createdAt)}
              </span>
              {program.updatedAt && program.updatedAt !== program.createdAt && (
                <span>آخر تعديل: {relativeTime(program.updatedAt)}</span>
              )}
            </div>

            {/* Action buttons */}
            <Separator />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                className="flex-1 gap-1.5"
              >
                {program.isFavorite ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />}
                {program.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
              >
                <Trash2 className="size-3.5" />
                حذف
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
