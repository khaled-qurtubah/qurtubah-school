'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { STATUS_COLORS } from '@/lib/constants'
import type { Program, Employee, Department } from '@/lib/types'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Loader2, List, Users, Building2, ArrowRight } from 'lucide-react'
import { useProgramDetailStore } from '@/lib/program-detail-store'

interface SearchResult {
  programs: Program[]
  employees: Employee[]
  departments: Department[]
}

export default function SearchDialog() {
  const { searchOpen, setSearchOpen, setActiveTab } = useAppStore()
  const openProgramDetail = useProgramDetailStore(s => s.open)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ programs: [], employees: [], departments: [] })
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ programs: [], employees: [], departments: [] })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setResults({
          programs: data.programs || [],
          employees: data.employees || [],
          departments: data.departments || [],
        })
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResults(query)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults])

  // Reset query when dialog opens/closes
  useEffect(() => {
    if (!searchOpen) {
      setQuery('')
      setResults({ programs: [], employees: [], departments: [] })
    }
  }, [searchOpen])

  const handleSelectProgram = (program: Program) => {
    openProgramDetail(program.id)
    setActiveTab('programs')
    setSearchOpen(false)
  }

  const handleSelectEmployee = (employee: Employee) => {
    setActiveTab('employees')
    setSearchOpen(false)
    window.dispatchEvent(new CustomEvent('highlight-employee', { detail: { id: employee.id } }))
  }

  const handleSelectDepartment = (department: Department) => {
    setActiveTab('departments')
    setSearchOpen(false)
  }

  const totalResults = results.programs.length + results.employees.length + results.departments.length

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="بحث شامل"
      description="ابحث في البرامج والموظفين والأقسام"
    >
      <CommandInput
        placeholder="ابحث عن برنامج أو موظف أو قسم..."
        value={query}
        onValueChange={setQuery}
        dir="rtl"
      />
      <CommandList>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-sm text-muted-foreground">لم يتم العثور على نتائج</p>
                <p className="text-xs text-muted-foreground">جرّب كلمات بحث مختلفة</p>
              </div>
            </CommandEmpty>

            {results.programs.length > 0 && (
              <CommandGroup heading={`البرامج (${results.programs.length})`}>
                {results.programs.map((program) => {
                  const statusColor = STATUS_COLORS[program.status]
                  return (
                    <CommandItem
                      key={program.id}
                      onSelect={() => handleSelectProgram(program)}
                      className="flex items-center gap-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="shrink-0">
                          <div
                            className="size-8 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: program.department?.color
                                ? `${program.department.color}20`
                                : 'rgba(16,185,129,0.1)',
                            }}
                          >
                            <List className="size-4" style={{ color: program.department?.color || '#10b981' }} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{program.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {program.department?.name && (
                              <span className="truncate">{program.department.name}</span>
                            )}
                            {program.department?.name && program.employee?.name && (
                              <span>•</span>
                            )}
                            {program.employee?.name && (
                              <span className="truncate">{program.employee.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusColor && (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${statusColor.bg} ${statusColor.text}`}>
                            <span className={`size-1 rounded-full ${statusColor.dot}`} />
                            {program.status}
                          </span>
                        )}
                        <ArrowRight className="size-3 text-muted-foreground/50" />
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {results.employees.length > 0 && (results.programs.length > 0) && <CommandSeparator />}

            {results.employees.length > 0 && (
              <CommandGroup heading={`الموظفين (${results.employees.length})`}>
                {results.employees.map((employee) => (
                  <CommandItem
                    key={employee.id}
                    onSelect={() => handleSelectEmployee(employee)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="size-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: employee.department?.color
                            ? `${employee.department.color}20`
                            : 'rgba(16,185,129,0.1)',
                        }}
                      >
                        <Users className="size-4" style={{ color: employee.department?.color || '#10b981' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{employee.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{employee.position}</span>
                          {employee.department?.name && (
                            <>
                              <span>•</span>
                              <span className="truncate">{employee.department.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="size-3 text-muted-foreground/50 shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.departments.length > 0 && (results.employees.length > 0 || results.programs.length > 0) && <CommandSeparator />}

            {results.departments.length > 0 && (
              <CommandGroup heading={`الأقسام (${results.departments.length})`}>
                {results.departments.map((department) => (
                  <CommandItem
                    key={department.id}
                    onSelect={() => handleSelectDepartment(department)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="size-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: department.color || '#6b7280' }}
                      >
                        <Building2 className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{department.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{department._count?.programs || 0} برنامج</span>
                          <span>•</span>
                          <span>{department._count?.employees || 0} موظف</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="size-3 text-muted-foreground/50 shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && query.trim() && totalResults > 0 && (
              <div className="px-3 py-2 border-t text-center text-xs text-muted-foreground">
                إجمالي النتائج: {totalResults} عنصر
              </div>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
