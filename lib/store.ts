import { create } from 'zustand'
import type { TabId, FilterState } from './types'

interface DashboardSections {
  kpis: boolean
  needsAttention: boolean
  recentActivity: boolean
}

interface AppState {
  // التبويب النشط
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  // الفلاتر
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  resetFilters: () => void

  // حالة التحميل
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // البحث
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // تحديث البيانات
  lastUpdated: number
  triggerUpdate: () => void

  // فلتر المفضلة
  showFavoritesOnly: boolean
  toggleShowFavorites: () => void

  // تخصيص لوحة المؤشرات
  dashboardSections: DashboardSections
  toggleDashboardSection: (section: keyof DashboardSections) => void
}

const defaultFilters: FilterState = {
  year: 2025,
  month: 0,
  departmentId: null,
  status: null,
  priority: null,
  search: '',
}

const defaultDashboardSections: DashboardSections = {
  kpis: true,
  needsAttention: true,
  recentActivity: true,
}

// Load persisted dashboard sections from localStorage
function loadDashboardSections(): DashboardSections {
  if (typeof window === 'undefined') return defaultDashboardSections
  try {
    const saved = localStorage.getItem('dashboardSections')
    if (saved) {
      return { ...defaultDashboardSections, ...JSON.parse(saved) }
    }
  } catch {
    // ignore
  }
  return defaultDashboardSections
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'calendar',
  setActiveTab: (tab) => set({ activeTab: tab }),

  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  lastUpdated: Date.now(),
  triggerUpdate: () => set({ lastUpdated: Date.now() }),

  showFavoritesOnly: false,
  toggleShowFavorites: () => set((state) => ({ showFavoritesOnly: !state.showFavoritesOnly })),

  dashboardSections: defaultDashboardSections,
  toggleDashboardSection: (section) => {
    const current = get().dashboardSections
    const updated = { ...current, [section]: !current[section] }
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dashboardSections', JSON.stringify(updated))
      } catch {
        // ignore
      }
    }
    set({ dashboardSections: updated })
  },
}))

// Initialize dashboard sections from localStorage on client side
if (typeof window !== 'undefined') {
  const sections = loadDashboardSections()
  if (JSON.stringify(sections) !== JSON.stringify(defaultDashboardSections)) {
    useAppStore.setState({ dashboardSections: sections })
  }
}
