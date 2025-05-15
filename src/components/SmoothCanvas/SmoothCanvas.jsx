// src/components/SmoothCanvas/SmoothCanvas.jsx
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { CanvasEngine } from './core/CanvasEngine';
import { EventHandler } from './core/EventHandler';
import { CanvasRenderer } from './core/CanvasRenderer';
import styles from './SmoothCanvas.module.scss';

const SmoothCanvas = forwardRef(({
  width = 900,
  height = 700,
  currentTool = 'pen',
  strokeColor = '#000000',
  strokeWidth = 5,
  eraserWidth = 10,
  onCanvasChange,
  backgroundImageUrl = null,

}, ref) => {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const engineRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const rendererRef = useRef(null);
  
  const [paths, setPaths] = useState([]);
  const [pathsToErase, setPathsToErase] = useState(new Set());
  const [eraserPosition, setEraserPosition] = useState({ x: 0, y: 0 });
  const [showEraser, setShowEraser] = useState(false);

  // Initialize engine and handlers
  useEffect(() => {
    if (!canvasRef.current || !svgRef.current) return;

    const engine = new CanvasEngine(canvasRef, svgRef, {
      width,
      height,
      strokeColor,
      strokeWidth,
      eraserWidth
    });

    const eventHandler = new EventHandler(engine, {
      currentTool,
      strokeColor,
      strokeWidth,
      eraserWidth
    });

    const renderer = new CanvasRenderer(engine);

    // Set up callbacks
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
        setPaths([...engine.getPaths()]);
        if (onCanvasChange) {
          engine.exportAsDataUrl('png').then(dataUrl => {
            onCanvasChange(dataUrl);
          });
        }
      },
      onPathsErased: () => {
        setPaths([...engine.getPaths()]);
        if (onCanvasChange) {
          engine.exportAsDataUrl('png').then(dataUrl => {
            onCanvasChange(dataUrl);
          });
        }
      },
      onPathsMarkedForErase: (pathsToErase) => {
        setPathsToErase(new Set(pathsToErase));
      },
      onEraserMove: (position) => {
        setEraserPosition(position);
      },
      onEraserShow: (show) => {
        setShowEraser(show);
      }
    });

    // Attach event listeners
    eventHandler.attachListeners(canvasRef.current);

    engineRef.current = engine;
    eventHandlerRef.current = eventHandler;
    rendererRef.current = renderer;

    return () => {
      if (eventHandlerRef.current && canvasRef.current) {
        eventHandlerRef.current.detachListeners(canvasRef.current);
      }
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  // Update options when props change
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current) {
      engineRef.current.updateOptions({
        width,
        height,
        strokeColor,
        strokeWidth,
        eraserWidth
      });

      eventHandlerRef.current.options = {
        ...eventHandlerRef.current.options,
        currentTool,
        strokeColor,
        strokeWidth,
        eraserWidth
      };

      // Set erasing mode
      engineRef.current.isErasing = currentTool === 'eraser';
      
      if (currentTool !== 'eraser') {
        setPathsToErase(new Set());
        setShowEraser(false);
      }
    }
  }, [width, height, currentTool, strokeColor, strokeWidth, eraserWidth]);

  const loadCanvasData = (dataUrl) => {
    if (!dataUrl || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the loaded image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    
    img.onerror = (error) => {
      console.error('Error loading canvas data:', error);
    };
    
    img.src = dataUrl;
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({

    

    eraseMode: (mode) => {
      if (engineRef.current) {
        engineRef.current.isErasing = mode;
      }
    },
    exportImage: async (format = 'png') => {
      if (engineRef.current) {
        return engineRef.current.exportAsDataUrl(format);
      }
      return '';
    },
    clearCanvas: () => {
      if (engineRef.current) {
        engineRef.current.clearPaths();
        setPaths([]);
        setPathsToErase(new Set());
        
        // Remove temp path
        const svg = svgRef.current;
        const tempPath = svg?.querySelector('#temp-path');
        if (tempPath) tempPath.remove();

        if (onCanvasChange) {
          setTimeout(() => {
            engineRef.current.exportAsDataUrl('png').then(dataUrl => {
              onCanvasChange(dataUrl);
            });
          }, 10);
        }
      }
    },
    undo: () => {
      if (engineRef.current) {
        const success = engineRef.current.undo();
        if (success) {
          setPaths([...engineRef.current.getPaths()]);
          if (onCanvasChange) {
            setTimeout(() => {
              engineRef.current.exportAsDataUrl('png').then(dataUrl => {
                onCanvasChange(dataUrl);
              });
            }, 10);
          }
        }
        return success;
      }
      return false;
    },
    loadCanvasData: loadCanvasData // Add this line
  }));

  const dpr = window.devicePixelRatio || 1;

  return (
    <div
      className={`${styles.canvasContainer} ${styles[`${currentTool}Mode`]}`}
      style={{ width, height }}
    >
      {/* Background layers */}
      {backgroundImageUrl && rendererRef.current?.renderBackgroundImage(backgroundImageUrl, width, height)}
      
      {/* Canvas for potential raster operations - ensure background is transparent */}
      <canvas
        ref={canvasRef}
        width={width * dpr}
        height={height * dpr}
        className={styles.canvas}
        style={{
          touchAction: 'none',
          width: `${width}px`,
          height: `${height}px`,
          background: 'transparent' // Ensure canvas background is transparent
        }}
      />

      {/* SVG for vector drawing */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        style={{
          pointerEvents: 'none',
          shapeRendering: 'geometricPrecision'
        }}
      >
        {/* Render paths */}
        {rendererRef.current?.renderPaths()}
      </svg>

      {/* Eraser cursor */}
      {currentTool === 'eraser' && showEraser && 
        rendererRef.current?.renderEraserCursor(showEraser, eraserPosition, eraserWidth)}
    </div>
  );
});

SmoothCanvas.displayName = 'SmoothCanvas';

export default SmoothCanvas;