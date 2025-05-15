// src/components/FabricCanvas/FabricCanvas.jsx
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, PencilBrush, CircleBrush, SprayBrush, PatternBrush, Circle, Shadow } from 'fabric';
import styles from './FabricCanvas.module.scss';

const FabricCanvas = forwardRef(({
  width = 900,
  height = 700,
  currentTool = 'pen',
  strokeColor = '#000000',
  strokeWidth = 5,
  onCanvasChange,
}, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Initialize Fabric.js canvas - following official example
    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      width,
      height,
      backgroundColor: '#ffffff',
      selection: false,
    });

    // Set default drawing brush - PencilBrush like in the example
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    
    // Configure brush properties following the example pattern
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
      
      // Add shadow for better visual quality (from example)
      canvas.freeDrawingBrush.shadow = new Shadow({
        blur: 0,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: strokeColor,
      });
    }

    // Handle single points - custom implementation for dots
    let singlePointTimer = null;
    let startPosition = null;
    let hasMovedSignificantly = false;
    const moveThreshold = 3;

    const handleMouseDown = (e) => {
      if (!canvas.isDrawingMode) return;
      
      const pointer = canvas.getPointer(e.e);
      startPosition = { x: pointer.x, y: pointer.y };
      hasMovedSignificantly = false;
      setIsDrawing(true);

      // Set timer for single point detection
      singlePointTimer = setTimeout(() => {
        if (!hasMovedSignificantly && canvas.isDrawingMode) {
          createSinglePoint(startPosition.x, startPosition.y);
        }
      }, 150);
    };

    const handleMouseMove = (e) => {
      if (!canvas.isDrawingMode || !isDrawing) return;
      
      const pointer = canvas.getPointer(e.e);
      
      // Check for significant movement
      if (!hasMovedSignificantly && startPosition) {
        const dx = pointer.x - startPosition.x;
        const dy = pointer.y - startPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > moveThreshold) {
          hasMovedSignificantly = true;
          if (singlePointTimer) {
            clearTimeout(singlePointTimer);
            singlePointTimer = null;
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      hasMovedSignificantly = false;
      startPosition = null;
      
      if (singlePointTimer) {
        clearTimeout(singlePointTimer);
        singlePointTimer = null;
      }
    };

    // Create single point dot
    const createSinglePoint = (x, y) => {
      const radius = strokeWidth / 2;
      const circle = new Circle({
        left: x,
        top: y,
        radius: radius,
        fill: strokeColor,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      
      canvas.add(circle);
      canvas.renderAll();
      triggerChange();
    };

    // Attach event listeners
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    
    // Handle path creation (when drawing strokes)
    canvas.on('path:created', () => {
      triggerChange();
    });

    // Trigger canvas change callback
    const triggerChange = () => {
      if (onCanvasChange) {
        setTimeout(() => {
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 0.9,
          });
          onCanvasChange(dataURL);
        }, 10);
      }
    };

    fabricCanvasRef.current = canvas;

    // Cleanup
    return () => {
      if (singlePointTimer) clearTimeout(singlePointTimer);
      canvas.dispose();
    };
  }, []);

  // Update canvas properties when props change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Update canvas dimensions
    canvas.setDimensions({ width, height });

    // Update drawing mode based on current tool
    if (currentTool === 'pen') {
      canvas.isDrawingMode = true;
      
      // Use PencilBrush for pen tool (following example)
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      
    } else if (currentTool === 'eraser') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      
      // Handle eraser by clicking on objects to remove them
      const handleEraserClick = (e) => {
        if (currentTool === 'eraser' && e.target) {
          canvas.remove(e.target);
          canvas.renderAll();
          triggerChange();
        }
      };

      canvas.off('mouse:down', handleEraserClick);
      canvas.on('mouse:down', handleEraserClick);
    }

    // Update brush properties following the example pattern
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
      
      // Update shadow color to match stroke color
      if (canvas.freeDrawingBrush.shadow) {
        canvas.freeDrawingBrush.shadow.color = strokeColor;
      } else {
        canvas.freeDrawingBrush.shadow = new Shadow({
          blur: 0,
          offsetX: 0,
          offsetY: 0,
          affectStroke: true,
          color: strokeColor,
        });
      }
    }

    const triggerChange = () => {
      if (onCanvasChange) {
        setTimeout(() => {
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 0.9,
          });
          onCanvasChange(dataURL);
        }, 10);
      }
    };

    canvas.renderAll();
  }, [width, height, currentTool, strokeColor, strokeWidth, onCanvasChange]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        // Use clear() method like in the example
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        
        if (onCanvasChange) {
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 0.9,
          });
          onCanvasChange(dataURL);
        }
      }
    },
    
    undo: () => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const objects = canvas.getObjects();
        if (objects.length > 0) {
          canvas.remove(objects[objects.length - 1]);
          canvas.renderAll();
          
          if (onCanvasChange) {
            const dataURL = canvas.toDataURL({
              format: 'png',
              quality: 0.9,
            });
            onCanvasChange(dataURL);
          }
          return true;
        }
      }
      return false;
    },
    
    exportImage: async (format = 'png') => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        return canvas.toDataURL({
          format,
          quality: 0.9,
        });
      }
      return '';
    },
    
    // Method to change brush type (if needed in future)
    setBrushType: (brushType) => {
      const canvas = fabricCanvasRef.current;
      if (canvas && canvas.isDrawingMode) {
        switch (brushType) {
          case 'pencil':
            canvas.freeDrawingBrush = new PencilBrush(canvas);
            break;
          case 'circle':
            canvas.freeDrawingBrush = new CircleBrush(canvas);
            break;
          case 'spray':
            canvas.freeDrawingBrush = new SprayBrush(canvas);
            break;
          default:
            canvas.freeDrawingBrush = new PencilBrush(canvas);
        }
        
        // Reapply current settings
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = strokeColor;
          canvas.freeDrawingBrush.width = strokeWidth;
          canvas.freeDrawingBrush.shadow = new Shadow({
            blur: 0,
            offsetX: 0,
            offsetY: 0,
            affectStroke: true,
            color: strokeColor,
          });
        }
      }
    },
  }));

  return (
    <div className={styles.canvasContainer}>
      <canvas
        ref={canvasRef}
        className={styles.fabricCanvas}
        style={{
          touchAction: 'none',
        }}
      />
    </div>
  );
});

FabricCanvas.displayName = 'FabricCanvas';

export default FabricCanvas;