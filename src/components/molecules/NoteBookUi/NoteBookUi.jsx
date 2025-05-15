// src/components/molecules/NoteBookUi/NoteBookUi.jsx
import React, { useState, useEffect, useRef } from 'react'
import styles from './NoteBookUi.module.scss'
import SmoothCanvas from '../../SmoothCanvas/SmoothCanvas'

const NoteBookUi = ({ 
  onCanvasChange,
  currentTool = 'pen',
  strokeColor = '#000000',
  strokeWidth = 5,
  eraserWidth = 10
}) => {
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

  const handleCanvasChange = (dataUrl) => {
    if (onCanvasChange) {
      onCanvasChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  };

  const undo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const exportImage = async (format = 'png') => {
    if (canvasRef.current) {
      return await canvasRef.current.exportImage(format);
    }
    return '';
  };

  return (
    <div className={styles.notebookui_cover}>
      <div className={styles.notebookui_holes_div}>
        {Array.from({ length: numberOfHoles }).map((_, index) => (
          <div key={index} className={styles.notebookui_holes}></div>
        ))}
      </div>

      <div className={styles.notebookui_content}>
        <SmoothCanvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          currentTool={currentTool}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          eraserWidth={eraserWidth}
          onCanvasChange={handleCanvasChange}
          showGrid={true}
          gridSize={20}
          gridColor="#e5e7eb"
        />
      </div>
    </div>
  );
};

// Export additional methods for parent components to use
export const useNoteBookUi = () => {
  const ref = useRef(null);
  
  return {
    ref,
    clearCanvas: () => ref.current?.clearCanvas(),
    undo: () => ref.current?.undo(),
    exportImage: (format) => ref.current?.exportImage(format)
  };
};

export default NoteBookUi;