import { create } from "zustand"

type ElixirStore = {
  giveaway: { active: boolean; amount: string; secs: number; endsAt: number } | null
  chatOpen: boolean
  setGiveaway: (g: ElixirStore["giveaway"]) => void
  setChatOpen: (v: boolean) => void
}

export const useElixirStore = create<ElixirStore>((set) => ({
  giveaway: null,
  chatOpen: false,
  setGiveaway: (g) => set({ giveaway: g }),
  setChatOpen: (v) => set({ chatOpen: v }),
}))