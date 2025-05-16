// src/components/molecules/NoteBookUi/NoteBookUi.jsx - Simple Excalidraw-style saving
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

  // Simple loading - load the data when it changes
  useEffect(() => {
 ;
    
    if (canvasRef.current && initialCanvasData !== null) {
    
      
      // Check if there's actual content to load
      if (initialCanvasData && initialCanvasData !== '""' && initialCanvasData !== '{}') {
        try {
          // Parse the data to check if it has elements
          const parsed = typeof initialCanvasData === 'string' 
            ? JSON.parse(initialCanvasData) 
            : initialCanvasData;
          
 
          
          if (parsed && parsed.elements && parsed.elements.length > 0) {
     
            canvasRef.current.loadDrawingData(initialCanvasData);
          } 
        } catch (error) {
          console.error('Error parsing canvas data:', error);
        }
      } 
    }
  }, [initialCanvasData]);

  // Generate background pattern styles
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

  // Simple canvas change handler - Excalidraw style
  const handleCanvasChange = (vectorData) => {
    if (!onCanvasChange) return;
    
    // Simple version check - only save if data actually changed
    const currentVersion = vectorData ? JSON.stringify(vectorData) : null;
    
    if (currentVersion !== lastSavedVersionRef.current) {
      lastSavedVersionRef.current = currentVersion;
      console.log('Canvas changed, saving...');
      onCanvasChange(vectorData);
    }
  };

  const backgroundStyle = generateBackgroundPattern();

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
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
        canvasRef.current.loadDrawingData(vectorData);
      }
    },
    loadDrawingData: (vectorData) => {
      if (canvasRef.current && vectorData) {
        canvasRef.current.loadDrawingData(vectorData);
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