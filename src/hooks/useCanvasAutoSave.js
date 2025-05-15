// hooks/useCanvasAutoSave.js - Hook for automatic canvas saving
import { useEffect, useRef, useCallback } from 'react';

export const useCanvasAutoSave = (onSave, delay = 2000) => {
  const timeoutRef = useRef(null);
  const lastSaveRef = useRef(null);

  // Debounced save function
  const debouncedSave = useCallback((data) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (onSave && data && data !== lastSaveRef.current) {
        onSave(data);
        lastSaveRef.current = data;
      }
    }, delay);
  }, [onSave, delay]);

  // Manual save function (immediate)
  const saveNow = useCallback((data) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (onSave && data && data !== lastSaveRef.current) {
      onSave(data);
      lastSaveRef.current = data;
    }
  }, [onSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { debouncedSave, saveNow };
};