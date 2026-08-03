import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LLMEngine = 'fast' | 'deep';

interface SettingsState {
  llmEngine: LLMEngine;
  highContrast: boolean;
  textScale: number; // e.g. 1.0, 1.1, 1.2
  isToolsDrawerOpen: boolean;
  setLlmEngine: (engine: LLMEngine) => void;
  setHighContrast: (val: boolean) => void;
  setTextScale: (scale: number) => void;
  toggleToolsDrawer: (isOpen?: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      llmEngine: 'fast',
      highContrast: false,
      textScale: 1.0,
      isToolsDrawerOpen: false,
      setLlmEngine: (engine) => set({ llmEngine: engine }),
      setHighContrast: (val) => set({ highContrast: val }),
      setTextScale: (scale) => set({ textScale: scale }),
      toggleToolsDrawer: (isOpen) => set((state) => ({ 
        isToolsDrawerOpen: isOpen !== undefined ? isOpen : !state.isToolsDrawerOpen 
      })),
    }),
    {
      name: 'health-assist-settings',
    }
  )
);
