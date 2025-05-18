// src/components/molecules/NoteBookUi/NoteBookUi.jsx - Fixed to properly forward the addShape method
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
  initialCanvasData = null,
  temporaryShape = null, // Add support for temporary shape
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
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

  // Fixed loading - prevent save during initial load
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
            console.log('Loading canvas data...');
            canvasRef.current.loadDrawingData(initialCanvasData);
            // Set the last saved version to prevent immediate save
            lastSavedVersionRef.current = initialCanvasData;
          } 
        } catch (error) {
          console.error('Error parsing canvas data:', error);
        }
      }
      
      // Mark loading as complete after a short delay
      setTimeout(() => {
        isLoadingRef.current = false;
        initialLoadCompleteRef.current = true;
        console.log('Initial load complete');
      }, 100);
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

  const backgroundStyle = generateBackgroundPattern();

  // Add explicit shape handling method to forward to SmoothCanvas
  const addShape = (shapeData) => {
    if (canvasRef.current && canvasRef.current.addShape) {
      console.log('NoteBookUi: Forwarding addShape call to SmoothCanvas', shapeData);
      return canvasRef.current.addShape(shapeData);
    } else {
      console.error('NoteBookUi: SmoothCanvas reference or addShape method not available');
      return null;
    }
  };

  // Expose methods via ref - WITH PROPER FORWARDING OF ALL METHODS
  useImperativeHandle(ref, () => ({
    // Forward all methods from SmoothCanvas
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
    // The critical one - forward addShape to SmoothCanvas
    addShape: addShape,
    
    // Important: provide direct access to the canvas ref if needed
    canvasRef: canvasRef
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
          temporaryShape={temporaryShape}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
      </div>
    </div>
  );
});

NoteBookUi.displayName = 'NoteBookUi';

export default NoteBookUi;