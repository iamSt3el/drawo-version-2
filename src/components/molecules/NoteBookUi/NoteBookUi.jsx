// src/components/molecules/NoteBookUi/NoteBookUi.jsx - Simplified loading
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

    // Set initial values
    updateSizeAndHoles();

    // Add event listener for window resize
    window.addEventListener('resize', updateSizeAndHoles);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', updateSizeAndHoles);
    };
  }, []);

  // Simple loading: whenever initialCanvasData changes, load it
  useEffect(() => {
    if (canvasRef.current && initialCanvasData) {
      console.log('NoteBookUi: Loading initial data');
      canvasRef.current.loadDrawingData(initialCanvasData);
    } else if (canvasRef.current && !initialCanvasData) {
      console.log('NoteBookUi: No initial data, clearing canvas');
      canvasRef.current.clearCanvas();
    }
  }, [initialCanvasData]);

  // Generate background pattern styles
  const generateBackgroundPattern = () => {
    const size = patternSize;
    
    // Create color with opacity for the pattern
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
        return {
          background: 'white'
        };
    }
  };

  const handleCanvasChange = (vectorData) => {
    if (onCanvasChange) {
      onCanvasChange(vectorData);
    }
  };

  const backgroundStyle = generateBackgroundPattern();

  // Expose methods via ref - now using vector data methods
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
    // Simple loading function - just pass data through
    loadCanvasData: (vectorData) => {
      if (canvasRef.current && vectorData) {
        console.log('NoteBookUi: Loading data via ref');
        canvasRef.current.loadDrawingData(vectorData);
      }
    },
    loadDrawingData: (vectorData) => {
      if (canvasRef.current && vectorData) {
        console.log('NoteBookUi: Loading data via loadDrawingData');
        canvasRef.current.loadDrawingData(vectorData);
      }
    },
    canvasRef: canvasRef.current // Expose canvas ref for direct access
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