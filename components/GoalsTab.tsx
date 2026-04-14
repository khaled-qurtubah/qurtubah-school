'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTHS, getProgressColor, GOAL_CATEGORIES, GOAL_CATEGORY_MAP } from '@/lib/constants'
import type { Goal, GoalCategory } from '@/lib/types'
import { Plus, Target, CheckCircle2, Circle, Pencil, Trash2, Loader2, GraduationCap, Settings, Users, TrendingUp, Globe, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  GraduationCap,
  Settings,
  Users,
  TrendingUp,
  Globe,
  Target,
}

interface GoalFormData {
  title: string
  target: string
  achieved: string
  year: string
  month: string
  category: string
}

const defaultFormData: GoalFormData = {
  title: '',
  target: '',
  achieved: '0',
  year: new Date().getFullYear().toString(),
  month: (new Date().getMonth() + 1).toString(),
  category: 'general',
}

export default function GoalsTab() {
  const { filters, setFilter, lastUpdated } = useAppStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [formData, setFormData] = useState<GoalFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)
  const [editingAchievedId, setEditingAchievedId] = useState<string | null>(null)
  const [editingAchievedValue, setEditingAchievedValue] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [markingComplete, setMarkingComplete] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year: String(filters.year) })
      if (filters.month && filters.month > 0) params.set('month', String(filters.month))
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await fetch(`/api/goals?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setGoals(Array.isArray(data) ? data : data.data || [])
      }
    } catch {
      toast.error('فشل في تحميل الأهداف')
    } finally {
      setLoading(false)
    }
  }, [filters.year, filters.month, categoryFilter])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals, lastUpdated])

  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const totalAchieved = goals.reduce((sum, g) => sum + g.achieved, 0)
  const overallPercentage = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0
  const completedGoals = goals.filter(g => g.achieved >= g.target).length

  const openAddDialog = () => {
    setEditingGoal(null)
    setFormData({
      ...defaultFormData,
      year: filters.year.toString(),
      month: filters.month > 0 ? filters.month.toString() : (new Date().getMonth() + 1).toString(),
      category: categoryFilter !== 'all' ? categoryFilter : 'general',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      target: goal.target.toString(),
      achieved: goal.achieved.toString(),
      year: goal.year.toString(),
      month: goal.month.toString(),
      category: goal.category || 'general',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('يرجى إدخال عنوان الهدف')
      return
    }
    const target = parseInt(formData.target)
    const achieved = parseInt(formData.achieved)
    if (isNaN(target) || target <= 0) {
      toast.error('يرجى إدخال قيمة المستهدف صحيحة')
      return
    }
    if (isNaN(achieved) || achieved < 0) {
      toast.error('يرجى إدخال قيمة المنجزة صحيحة')
      return
    }

    setSaving(true)
    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals'
      const method = editingGoal ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          target,
          achieved,
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          category: formData.category || 'general',
        }),
      })
      if (res.ok) {
        toast.success(editingGoal ? 'تم تحديث الهدف بنجاح' : 'تم إضافة الهدف بنجاح')
        setDialogOpen(false)
        fetchGoals()
      } else {
        toast.error('فشل في حفظ الهدف')
      }
    } catch {
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (goal: Goal) => {
    if (!confirm(`هل تريد حذف الهدف "${goal.title}"؟`)) return
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف الهدف بنجاح')
        fetchGoals()
      } else {
        toast.error('فشل في حذف الهدف')
      }
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const startEditAchieved = (goal: Goal) => {
    setEditingAchievedId(goal.id)
    setEditingAchievedValue(goal.achieved.toString())
  }

  const saveEditAchieved = async (goalId: string) => {
    const newVal = parseInt(editingAchievedValue)
    if (isNaN(newVal) || newVal < 0) {
      toast.error('يرجى إدخال قيمة صحيحة')
      return
    }
    try {
      const goal = goals.find(g => g.id === goalId)
      if (!goal) return
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: goal.title,
          target: goal.target,
          achieved: newVal,
          year: goal.year,
          month: goal.month,
          category: goal.category,
        }),
      })
      if (res.ok) {
        toast.success('تم تحديث القيمة المنجزة')
        setEditingAchievedId(null)
        fetchGoals()
      } else {
        toast.error('فشل في التحديث')
      }
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const handleMarkComplete = async (goal: Goal) => {
    if (goal.achieved >= goal.target) return
    setMarkingComplete(goal.id)
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achieved: goal.target }),
      })
      if (res.ok) {
        toast.success(`تم إكمال الهدف "${goal.title}"`)
        fetchGoals()
      } else {
        toast.error('فشل في تحديث الهدف')
      }
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setMarkingComplete(null)
    }
  }

  const getGoalProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-500'
    if (percentage >= 50) return 'bg-blue-500'
    if (percentage >= 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getGoalProgressTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400'
    if (percentage >= 50) return 'text-blue-600 dark:text-blue-400'
    if (percentage >= 25) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getCategoryBadge = (category: string) => {
    const cat = GOAL_CATEGORY_MAP[category] || GOAL_CATEGORY_MAP.general
    const IconComponent = CATEGORY_ICONS[cat.icon] || Target
    return (
      <Badge variant="outline" className={`${cat.color} text-[10px] gap-1 h-5 border`}>
        <IconComponent className="size-2.5" />
        {cat.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* فلتر السنة والشهر والتصنيف */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">الأهداف الشهرية</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.year.toString()}
            onValueChange={(v) => setFilter('year', parseInt(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(filters.month || 1).toString()}
            onValueChange={(v) => setFilter('month', parseInt(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {GOAL_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openAddDialog} size="default">
            <Plus className="h-4 w-4" />
            <span>إضافة هدف</span>
          </Button>
        </div>
      </div>

      {/* ملخص التقدم الإجمالي */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  الإنجاز الإجمالي
                </span>
                <Badge
                  className={
                    overallPercentage >= 100
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200'
                      : overallPercentage >= 70
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200'
                  }
                  variant="outline"
                >
                  {overallPercentage}%
                </Badge>
                {categoryFilter !== 'all' && (
                  getCategoryBadge(categoryFilter)
                )}
              </div>
              <Progress value={Math.min(overallPercentage, 100)} className="h-3 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalAchieved} من {totalTarget} — تم إنجاز {completedGoals} من {goals.length} هدف
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الأهداف */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="pt-0">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
                لا توجد أهداف لهذا الشهر
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                أضف أهدافك الشهرية لتتبع تقدمك
              </p>
              <Button onClick={openAddDialog} variant="outline">
                <Plus className="h-4 w-4" />
                <span>إضافة هدف جديد</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const percentage = goal.target > 0 ? Math.round((goal.achieved / goal.target) * 100) : 0
            const isCompleted = goal.achieved >= goal.target

            return (
              <Card
                key={goal.id}
                className={`transition-shadow hover:shadow-md ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : ''
                }`}
              >
                <CardContent className="pt-0">
                  {/* العنوان والحالة والتصنيف */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {goal.title}
                        </h3>
                        <div className="mt-1">
                          {getCategoryBadge(goal.category || 'general')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(goal)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => handleDelete(goal)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        التقدم
                      </span>
                      <span
                        className={`text-xs font-bold ${getGoalProgressTextColor(percentage)}`}
                      >
                        {percentage}%
                      </span>
                    </div>
                    <div className={`h-2.5 w-full rounded-full overflow-hidden ${percentage === 0 ? 'progress-bar-empty' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${percentage > 0 ? '' : ''}`}
                        style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: percentage >= 80 ? '#10b981' : percentage >= 50 ? '#3b82f6' : percentage >= 25 ? '#eab308' : '#ef4444' }}
                      />
                    </div>
                  </div>

                  {/* المنجز / المستهدف */}
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => startEditAchieved(goal)}
                    >
                      {editingAchievedId === goal.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            value={editingAchievedValue}
                            onChange={(e) => setEditingAchievedValue(e.target.value)}
                            className="h-7 w-20 text-xs text-center"
                            min={0}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditAchieved(goal.id)
                              if (e.key === 'Escape') setEditingAchievedId(null)
                            }}
                            onBlur={() => saveEditAchieved(goal.id)}
                          />
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {goal.achieved}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">من</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {goal.target}
                          </span>
                          <Pencil className="h-3 w-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 text-xs" variant="outline">
                          مكتمل
                        </Badge>
                      )}
                      {!isCompleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1"
                          onClick={(e) => { e.stopPropagation(); handleMarkComplete(goal) }}
                          disabled={markingComplete === goal.id}
                        >
                          {markingComplete === goal.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          إكمال
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* حوار إضافة/تعديل هدف */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'تعديل الهدف' : 'إضافة هدف جديد'}</DialogTitle>
            <DialogDescription>
              {editingGoal
                ? 'قم بتعديل بيانات الهدف'
                : `إضافة هدف لشهر ${MONTHS[parseInt(formData.month) - 1]} ${formData.year}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="goal-title">عنوان الهدف</Label>
              <Input
                id="goal-title"
                placeholder="مثال: تنفيذ 10 برامج تعليمية"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            {/* Category selector */}
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        {(() => {
                          const IconComp = CATEGORY_ICONS[cat.icon] || Target
                          return <IconComp className="size-3.5 text-muted-foreground" />
                        })()}
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-target">القيمة المستهدفة</Label>
                <Input
                  id="goal-target"
                  type="number"
                  placeholder="0"
                  min={1}
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-achieved">المنجز حالياً</Label>
                <Input
                  id="goal-achieved"
                  type="number"
                  placeholder="0"
                  min={0}
                  value={formData.achieved}
                  onChange={(e) => setFormData({ ...formData, achieved: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>السنة</Label>
                <Select
                  value={formData.year}
                  onValueChange={(v) => setFormData({ ...formData, year: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الشهر</Label>
                <Select
                  value={formData.month}
                  onValueChange={(v) => setFormData({ ...formData, month: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingGoal ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
