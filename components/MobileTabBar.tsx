'use client'

import { useAppStore } from '@/lib/store'
import { Calendar, List, Users, Building2, BarChart3 } from 'lucide-react'
import type { TabId } from '@/lib/types'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'calendar', label: 'التقويم', icon: Calendar },
  { id: 'programs', label: 'البرامج', icon: List },
  { id: 'employees', label: 'الموظفين', icon: Users },
  { id: 'departments', label: 'الأقسام', icon: Building2 },
  { id: 'statistics', label: 'الإحصائيات', icon: BarChart3 },
]

export default function MobileTabBar() {
  const activeTab = useAppStore(s => s.activeTab)
  const setActiveTab = useAppStore(s => s.setActiveTab)

  return (
    <nav className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mobile-tab-item flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'mobile-tab-active'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon className={`h-5 w-5 transition-all duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
