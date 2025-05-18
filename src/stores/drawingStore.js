// src/stores/drawingStore.js
import create from 'zustand';

export const useDrawingStore = create((set, get) => ({
  // State
  currentTool: 'pen',
  strokeColor: '#000000',
  strokeWidth: 5,
  opacity: 100,
  eraserWidth: 10,
  sketchyMode: false,
  
  // Fill settings for shapes
  fillEnabled: false,
  fillColor: '#000000',
  fillOpacity: 20,
  
  // Computed color with opacity
  get finalStrokeColor() {
    const { strokeColor, opacity } = get();
    
    if (opacity < 100) {
      const hex = strokeColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    }
    
    return strokeColor;
  },
  
  // Actions for tool selection
  setTool: (tool) => set({ currentTool: tool }),
  
  // Actions for stroke settings
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity: opacity }),
  setEraserWidth: (width) => set({ eraserWidth: width }),
  toggleSketchyMode: () => set(state => ({ sketchyMode: !state.sketchyMode })),
  
  // Actions for fill settings
  toggleFill: () => set(state => ({ fillEnabled: !state.fillEnabled })),
  setFillColor: (color) => set({ fillColor: color }),
  setFillOpacity: (opacity) => set({ fillOpacity: opacity }),
  
  // Batch update for multiple settings at once
  updateSettings: (settings) => set({ ...settings }),
  
  // Reset to defaults
  resetToolSettings: () => set({
    strokeColor: '#000000',
    strokeWidth: 5,
    opacity: 100,
    fillEnabled: false,
    fillColor: '#000000',
    fillOpacity: 20
  })
}));