// أنواع البيانات المشتركة

export type UserRole = 'admin' | 'deputy' | 'teacher'

export type ProgramStatus = 'لم تبدأ' | 'قيد التنفيذ' | 'مكتملة' | 'ملغاة'
export type ProgramPriority = 'عاجلة' | 'عالية' | 'متوسطة' | 'منخفضة'

export interface Department {
  id: string
  name: string
  color: string
  order: number
  _count?: {
    programs: number
    employees: number
  }
}

export interface Employee {
  id: string
  name: string
  position: string
  progress: number
  departmentId: string | null
  department?: Department | null
  _count?: {
    programs: number
  }
}

export interface Program {
  id: string
  name: string
  departmentId: string | null
  department?: Department | null
  employeeId: string | null
  employee?: Employee | null
  position?: string | null
  status: ProgramStatus
  priority: ProgramPriority
  progress: number
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
  year: number
  month: number
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  title: string
  target: number
  achieved: number
  category: string
  year: number
  month: number
}

export interface Setting {
  id: string
  key: string
  value: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  image?: string | null
  active: boolean
}

export interface BackupData {
  departments: Department[]
  employees: Employee[]
  programs: Program[]
  settings: Setting[]
  goals: Goal[]
  exportDate: string
  version: string
}

export type TabId = 'calendar' | 'programs' | 'timeline' | 'employees' | 'departments' | 'goals' | 'statistics' | 'reports'

export interface FilterState {
  year: number
  month: number
  departmentId: string | null
  status: string | null
  priority: string | null
  search: string
}
