// src/components/molecules/NoteBookUi/NoteBookUi.jsx - Fixed page settings application
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import styles from './NoteBookUi.module.scss'
import SmoothCanvas from '../../SmoothCanvas/SmoothCanvas'

const NoteBookUi = forwardRef(({ 
  onCanvasChange,
  currentTool = 'pen',
  strokeColor = '#000000',
  strokeWidth = 5,
  eraserWidth = 10,
  pattern = 'grid',
  patternSize = 20,
  patternColor = '#e5e7eb',
  patternOpacity = 50,
  initialCanvasData = null
}, ref) => {
  const canvasRef = useRef(null);
  const [numberOfHoles, setNumberOfHoles] = useState(25);
  const [canvasSize, setCanvasSize] = useState({ width: 870, height: 870 });
  const lastSavedVersionRef = useRef(null);
  const isLoadingRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);

  useEffect(() => {
    const updateSizeAndHoles = () => {
      const screenWidth = window.innerWidth;
      
      if (screenWidth <= 868) {
        setNumberOfHoles(24);
        setCanvasSize({ width: 670, height: 770 });
      } else {
        setNumberOfHoles(27);
        setCanvasSize({ width: 870, height: 870 });
      }
    };

    updateSizeAndHoles();
    window.addEventListener('resize', updateSizeAndHoles);
    return () => window.removeEventListener('resize', updateSizeAndHoles);
  }, []);

  // Fixed loading - prevent save during initial load and handle page changes
  useEffect(() => {
    if (canvasRef.current && initialCanvasData !== null) {
      isLoadingRef.current = true;
      
      // Check if there's actual content to load
      if (initialCanvasData && initialCanvasData !== '""' && initialCanvasData !== '{}') {
        try {
          // Parse the data to check if it has elements
          const parsed = typeof initialCanvasData === 'string' 
            ? JSON.parse(initialCanvasData) 
            : initialCanvasData;
          
          if (parsed && parsed.elements && parsed.elements.length > 0) {
            console.log('Loading canvas data with', parsed.elements.length, 'elements');
            canvasRef.current.loadDrawingData(initialCanvasData);
            // Set the last saved version to prevent immediate save
            lastSavedVersionRef.current = initialCanvasData;
          } else {
            // Clear canvas for empty page data
            console.log('Loading empty page - clearing canvas');
            canvasRef.current.clearCanvas();
            lastSavedVersionRef.current = initialCanvasData;
          }
        } catch (error) {
          console.error('Error parsing canvas data:', error);
          // If parsing fails, clear the canvas
          canvasRef.current.clearCanvas();
        }
      } else {
        // No canvas data or empty - clear the canvas
        console.log('No canvas data - clearing canvas');
        canvasRef.current.clearCanvas();
        lastSavedVersionRef.current = null;
      }
      
      // Mark loading as complete after a short delay
      setTimeout(() => {
        isLoadingRef.current = false;
        initialLoadCompleteRef.current = true;
        console.log('Canvas load complete');
      }, 100);
    }
  }, [initialCanvasData]);

  // Generate background pattern styles - fixed to use current props
  const generateBackgroundPattern = () => {
    const size = patternSize;
    const getPatternColorWithOpacity = (color, opacity) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    };

    const patternColorWithOpacity = getPatternColorWithOpacity(patternColor, patternOpacity);
    
    console.log('Generating pattern:', { pattern, patternSize, patternColor, patternOpacity });
    
    switch (pattern) {
      case 'grid':
        return {
          backgroundImage: `
            linear-gradient(to right, ${patternColorWithOpacity} 1px, transparent 1px),
            linear-gradient(to bottom, ${patternColorWithOpacity} 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`
        };
      case 'dots':
        return {
          backgroundImage: `radial-gradient(circle, ${patternColorWithOpacity} ${Math.max(1, size / 15)}px, transparent ${Math.max(2, size / 10)}px)`,
          backgroundSize: `${size}px ${size}px`
        };
      case 'lines':
        return {
          backgroundImage: `linear-gradient(to bottom, ${patternColorWithOpacity} 1px, transparent 1px)`,
          backgroundSize: `100% ${size}px`
        };
      case 'graph':
        return {
          backgroundImage: `
            linear-gradient(to right, ${getPatternColorWithOpacity(patternColor, patternOpacity * 0.5)} 0.5px, transparent 0.5px),
            linear-gradient(to bottom, ${getPatternColorWithOpacity(patternColor, patternOpacity * 0.5)} 0.5px, transparent 0.5px),
            linear-gradient(to right, ${patternColorWithOpacity} 1px, transparent 1px),
            linear-gradient(to bottom, ${patternColorWithOpacity} 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px, ${size}px ${size}px, ${size * 5}px ${size * 5}px, ${size * 5}px ${size * 5}px`
        };
      case 'blank':
      default:
        return { background: 'white' };
    }
  };

  // Fixed canvas change handler - prevent save during loading
  const handleCanvasChange = (vectorData) => {
    if (!onCanvasChange) return;
    
    // Don't save during initial loading
    if (isLoadingRef.current) {
      console.log('Skipping save - still loading');
      return;
    }

    // Don't save if initial load hasn't completed
    if (!initialLoadCompleteRef.current) {
      console.log('Skipping save - initial load not complete');
      return;
    }
    
    // String comparison to detect actual changes
    const currentVersion = vectorData ? JSON.stringify(vectorData) : null;
    
    if (currentVersion !== lastSavedVersionRef.current) {
      lastSavedVersionRef.current = currentVersion;
      console.log('Canvas changed, triggering save...');
      onCanvasChange(vectorData);
    } else {
      console.log('Skipping save - no change detected');
    }
  };

  // Generate background style every render to capture prop changes
  const backgroundStyle = generateBackgroundPattern();

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      if (canvasRef.current) {
        // Don't trigger save during programmatic clear
        isLoadingRef.current = true;
        canvasRef.current.clearCanvas();
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 50);
      }
    },
    undo: () => {
      if (canvasRef.current) {
        return canvasRef.current.undo();
      }
      return false;
    },
    exportImage: async (format = 'png') => {
      if (canvasRef.current) {
        return await canvasRef.current.exportImage(format);
      }
      return '';
    },
    exportJSON: () => {
      if (canvasRef.current) {
        return canvasRef.current.exportJSON();
      }
      return null;
    },
    exportSVG: () => {
      if (canvasRef.current) {
        return canvasRef.current.exportSVG();
      }
      return '';
    },
    loadCanvasData: (vectorData) => {
      if (canvasRef.current && vectorData) {
        isLoadingRef.current = true;
        canvasRef.current.loadDrawingData(vectorData);
        lastSavedVersionRef.current = vectorData;
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      }
    },
    loadDrawingData: (vectorData) => {
      if (canvasRef.current && vectorData) {
        isLoadingRef.current = true;
        canvasRef.current.loadDrawingData(vectorData);
        lastSavedVersionRef.current = vectorData;
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      }
    },
    canvasRef: canvasRef.current
  }));

  return (
    <div className={styles.notebookui_cover}>
      <div className={styles.notebookui_holes_div}>
        {Array.from({ length: numberOfHoles }).map((_, index) => (
          <div key={index} className={styles.notebookui_holes}></div>
        ))}
      </div>

      <div 
        className={styles.notebookui_content} 
        style={{
          ...backgroundStyle,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <SmoothCanvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          currentTool={currentTool}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          eraserWidth={eraserWidth}
          onCanvasChange={handleCanvasChange}
        />
      </div>
    </div>
  );
});

NoteBookUi.displayName = 'NoteBookUi';

export default NoteBookUi;