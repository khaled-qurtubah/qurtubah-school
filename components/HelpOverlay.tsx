'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Calendar, List, Clock, Users, Building2, Target,
  BarChart3, FileText, Search, Plus, Keyboard,
  GraduationCap, Settings, UsersRound, TrendingUp, Globe, Command
} from 'lucide-react'

interface HelpOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TAB_SHORTCUTS = [
  { key: '1', label: 'التقويم', Icon: Calendar },
  { key: '2', label: 'البرامج', Icon: List },
  { key: '3', label: 'الخط الزمني', Icon: Clock },
  { key: '4', label: 'الموظفين', Icon: Users },
  { key: '5', label: 'الأقسام', Icon: Building2 },
  { key: '6', label: 'الأهداف', Icon: Target },
  { key: '7', label: 'الإحصائيات', Icon: BarChart3 },
  { key: '8', label: 'التقارير', Icon: FileText },
]

const ACTION_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'البحث الشامل' },
  { keys: ['/'], label: 'الافتتاح السريع' },
  { keys: ['N'], label: 'برنامج جديد', hint: 'تبويب البرامج' },
  { keys: ['1–4'], label: 'تغيير حالة البرنامج', hint: 'تبويب البرامج' },
]

const GENERAL_SHORTCUTS = [
  { keys: ['?'], label: 'عرض المساعدة' },
  { keys: ['Esc'], label: 'إغلاق النافذة المفتوحة' },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none inline-flex h-7 min-w-7 select-none items-center justify-center rounded-md border border-border bg-muted/80 px-2 font-mono text-[11px] font-semibold text-muted-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  )
}

export default function HelpOverlay({ open, onOpenChange }: HelpOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-bl from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 px-6 pt-6 pb-4">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <Command className="size-4" />
              </div>
              اختصارات لوحة المفاتيح
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              استخدم هذه الاختصارات للتنقل بسرعة في النظام
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Tab Navigation Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <Keyboard className="size-3" />
              </div>
              <h3 className="text-sm font-bold text-foreground">التنقل بين التبويبات</h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TAB_SHORTCUTS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <item.Icon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate flex-1">{item.label}</span>
                  <Kbd>{item.key}</Kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Program Actions Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-6 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                <Plus className="size-3" />
              </div>
              <h3 className="text-sm font-bold text-foreground">إجراءات البرامج</h3>
            </div>
            <div className="rounded-lg border bg-card divide-y">
              {ACTION_SHORTCUTS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    {item.hint && (
                      <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {item.hint}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground text-[10px]">+</span>}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-6 rounded-md bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400">
                <Settings className="size-3" />
              </div>
              <h3 className="text-sm font-bold text-foreground">عام</h3>
            </div>
            <div className="rounded-lg border bg-card divide-y">
              {GENERAL_SHORTCUTS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3.5 py-2.5"
                >
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 pt-2 border-t bg-muted/20">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            فهمت ✓
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
