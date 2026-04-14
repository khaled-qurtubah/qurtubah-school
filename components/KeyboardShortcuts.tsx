'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import type { TabId } from '@/lib/types'
import HelpOverlay from '@/components/HelpOverlay'

const TAB_KEYS: Record<string, TabId> = {
  '1': 'calendar',
  '2': 'programs',
  '3': 'timeline',
  '4': 'employees',
  '5': 'departments',
  '6': 'goals',
  '7': 'statistics',
  '8': 'reports',
}

export default function KeyboardShortcuts() {
  const { activeTab, setActiveTab, setSearchOpen } = useAppStore()
  const [helpOpen, setHelpOpen] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // Escape: close any open dialog
      if (e.key === 'Escape') {
        setHelpOpen(false)
        setSearchOpen(false)
        return
      }

      // Don't handle other shortcuts when typing in inputs
      if (isInput) return

      // Ctrl+K or /: open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      // ?: open help
      if (e.key === '?') {
        e.preventDefault()
        setHelpOpen((prev) => !prev)
        return
      }

      // n: open add new program dialog (only on Programs tab)
      if (e.key === 'n' && activeTab === 'programs') {
        e.preventDefault()
        // Dispatch a custom event that ProgramsTab can listen for
        window.dispatchEvent(new CustomEvent('open-add-program'))
        return
      }

      // 1-8: switch tabs
      if (e.key >= '1' && e.key <= '8') {
        const tabId = TAB_KEYS[e.key]
        if (tabId) {
          setActiveTab(tabId)
        }
      }
    },
    [activeTab, setActiveTab, setSearchOpen]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} />
  )
}
