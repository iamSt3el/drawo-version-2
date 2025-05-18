// src/stores/settingsStore.js
import create from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      // Theme
      theme: 'light', // 'light', 'dark', 'system'
      
      // Data storage
      dataDirectory: null, // For Electron version
      
      // Default settings
      defaultPenSettings: {
        color: '#000000',
        strokeWidth: 5,
        opacity: 100
      },
      
      defaultPageSettings: {
        pattern: 'grid',
        patternSize: 20,
        patternColor: '#e5e7eb',
        patternOpacity: 50
      },
      
      // Auto-save
      autoSaveEnabled: true,
      autoSaveInterval: 30, // seconds
      
      // Actions
      setTheme: (theme) => set({ theme }),
      setDataDirectory: (path) => set({ dataDirectory: path }),
      
      updateDefaultPenSettings: (settings) => set(state => ({
        defaultPenSettings: { ...state.defaultPenSettings, ...settings }
      })),
      
      updateDefaultPageSettings: (settings) => set(state => ({
        defaultPageSettings: { ...state.defaultPageSettings, ...settings }
      })),
      
      setAutoSave: (enabled) => set({ autoSaveEnabled: enabled }),
      setAutoSaveInterval: (seconds) => set({ autoSaveInterval: seconds })
    }),
    {
      name: 'drawo-settings',
      getStorage: () => localStorage,
    }
  )
);