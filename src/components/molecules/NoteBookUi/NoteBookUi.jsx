// src/components/molecules/NoteBookUi/NoteBookUi.jsx
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

  // Load initial canvas data when provided
  useEffect(() => {
    if (initialCanvasData && canvasRef.current) {
      canvasRef.current.loadCanvasData(initialCanvasData);
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

  const handleCanvasChange = (dataUrl) => {
    if (onCanvasChange) {
      onCanvasChange(dataUrl);
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
    loadCanvasData: (dataUrl) => {
      if (canvasRef.current) {
        canvasRef.current.loadCanvasData(dataUrl);
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

      <div className={styles.notebookui_content} style={backgroundStyle}>
        <SmoothCanvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          currentTool={currentTool}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          eraserWidth={eraserWidth}
          onCanvasChange={handleCanvasChange}
          initialCanvasData={initialCanvasData}
        />
      </div>
    </div>
  );
});

NoteBookUi.displayName = 'NoteBookUi';

export default NoteBookUi;