// الثوابت والألوان المستخدمة في النظام

export const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
] as const

export const STATUS_LIST = ['لم تبدأ', 'قيد التنفيذ', 'مكتملة', 'ملغاة'] as const
export const PRIORITY_LIST = ['عاجلة', 'عالية', 'متوسطة', 'منخفضة'] as const

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'لم تبدأ': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  'قيد التنفيذ': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'مكتملة': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'ملغاة': { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
}

export const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'عاجلة': { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  'عالية': { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  'متوسطة': { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  'منخفضة': { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
}

export const PROGRESS_COLORS: Record<string, string> = {
  high: 'text-emerald-600 dark:text-emerald-400',   // >= 80%
  medium: 'text-blue-600 dark:text-blue-400',        // 50-79%
  low: 'text-yellow-600 dark:text-yellow-400',       // 25-49%
  critical: 'text-red-600 dark:text-red-400',        // < 25%
}

export function getProgressColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500'
  if (value >= 50) return 'bg-blue-500'
  if (value >= 25) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function getProgressTextColor(value: number): string {
  if (value >= 80) return PROGRESS_COLORS.high
  if (value >= 50) return PROGRESS_COLORS.medium
  if (value >= 25) return PROGRESS_COLORS.low
  return PROGRESS_COLORS.critical
}

export function getProgressLabel(value: number): string {
  if (value >= 80) return 'ممتاز'
  if (value >= 50) return 'جيد'
  if (value >= 25) return 'متوسط'
  return 'ضعيف'
}

export const TABS = [
  { id: 'calendar', label: 'التقويم', icon: 'Calendar' },
  { id: 'programs', label: 'البرامج', icon: 'List' },
  { id: 'timeline', label: 'الخط الزمني', icon: 'Clock' },
  { id: 'employees', label: 'الموظفين', icon: 'Users' },
  { id: 'departments', label: 'الأقسام', icon: 'Building2' },
  { id: 'goals', label: 'الأهداف', icon: 'Target' },
  { id: 'statistics', label: 'الإحصائيات', icon: 'BarChart3' },
  { id: 'reports', label: 'التقارير', icon: 'FileText' },
] as const

export type GoalCategory = 'academic' | 'admin' | 'student_activities' | 'professional_development' | 'community' | 'general'

export const GOAL_CATEGORIES: { value: GoalCategory; label: string; icon: string; color: string }[] = [
  { value: 'academic', label: 'أكاديمي', icon: 'GraduationCap', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { value: 'admin', label: 'إداري', icon: 'Settings', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  { value: 'student_activities', label: 'نشاطات طلابية', icon: 'Users', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { value: 'professional_development', label: 'تطوير مهني', icon: 'TrendingUp', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { value: 'community', label: 'مجتمعي', icon: 'Globe', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { value: 'general', label: 'عام', icon: 'Target', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
]

export const GOAL_CATEGORY_MAP: Record<string, typeof GOAL_CATEGORIES[number]> = {
  academic: GOAL_CATEGORIES[0],
  admin: GOAL_CATEGORIES[1],
  student_activities: GOAL_CATEGORIES[2],
  professional_development: GOAL_CATEGORIES[3],
  community: GOAL_CATEGORIES[4],
  general: GOAL_CATEGORIES[5],
}

export const SCHOOL_COLORS = {
  primary: '#10b981',    // أخضر (إدارة)
  secondary: '#14b8a6',  // فيروزي (بيئة)
  accent: '#8b5cf6',     // بنفسجي (توجيه)
  info: '#0ea5e9',       // أزرق (تعليمية)
  danger: '#e11d48',     // أحمر (نشاط)
} as const

export const ITEMS_PER_PAGE = 15
