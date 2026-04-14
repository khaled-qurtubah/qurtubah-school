import { create } from 'zustand'

interface ProgramDetailState {
  programId: string | null
  isOpen: boolean
  open: (id: string) => void
  close: () => void
}

export const useProgramDetailStore = create<ProgramDetailState>((set) => ({
  programId: null,
  isOpen: false,
  open: (id) => set({ programId: id, isOpen: true }),
  close: () => set({ programId: null, isOpen: false }),
}))
