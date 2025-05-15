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
  showGrid = false,
  gridSize = 20,
  gridColor = '#e5e7eb'
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

    // Attach event listeners with passive options for better performance
    const element = canvasRef.current;
    element.style.touchAction = 'none';
    element.style.msTouchAction = 'none';
    
    // Add specific optimizations for writing
    element.style.webkitUserSelect = 'none';
    element.style.userSelect = 'none';
    element.style.webkitTouchCallout = 'none';
    
    eventHandler.attachListeners(element);

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
    }
  }));

  const dpr = window.devicePixelRatio || 1;

  return (
    <div
      className={`${styles.canvasContainer} ${styles[`${currentTool}Mode`]}`}
      style={{ width, height }}
    >
      {/* Background layers */}
      {backgroundImageUrl && rendererRef.current?.renderBackgroundImage(backgroundImageUrl, width, height)}
      {showGrid && rendererRef.current?.renderGrid(width, height, gridSize, gridColor)}
      
      {/* Canvas for optimal touch/pen input */}
      <canvas
        ref={canvasRef}
        width={width * dpr}
        height={height * dpr}
        className={styles.canvas}
        style={{
          touchAction: 'none',
          msTouchAction: 'none',
          width: `${width}px`,
          height: `${height}px`,
          // Ensure pixel-perfect rendering
          imageRendering: 'pixelated',
          imageRendering: '-webkit-optimize-contrast'
        }}
      />

      {/* SVG for vector drawing with optimized settings */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        style={{
          pointerEvents: 'none',
          shapeRendering: 'geometricPrecision',
          // Optimize for crisp strokes
          textRendering: 'geometricPrecision',
          colorRendering: 'optimizeQuality'
        }}
      >
        {/* Render paths with enhanced settings */}
        {rendererRef.current && paths.map((pathObj) => (
          <path
            key={pathObj.id}
            d={pathObj.pathData}
            fill={pathObj.color}
            stroke="none"
            fillRule="nonzero"
            style={{
              opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
              transition: 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              // Optimize path rendering
              vectorEffect: 'non-scaling-stroke',
              shapeRendering: pathObj.isSinglePoint ? 'auto' : 'geometricPrecision'
            }}
          />
        ))}
      </svg>

      {/* Enhanced eraser cursor */}
      {currentTool === 'eraser' && showEraser && (
        <div
          className={styles.eraserCursor}
          style={{
            width: eraserWidth * 2,
            height: eraserWidth * 2,
            left: eraserPosition.x - eraserWidth,
            top: eraserPosition.y - eraserWidth,
            position: 'absolute',
            border: '2px solid #ef4444',
            borderRadius: '50%',
            pointerEvents: 'none',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            zIndex: 10,
            // Enhanced animation
            animation: 'eraserPulse 1.5s infinite ease-in-out',
            // Add inner ring for better visibility
            boxShadow: 'inset 0 0 0 2px rgba(239, 68, 68, 0.3)'
          }}
        />
      )}
    </div>
  );
});

SmoothCanvas.displayName = 'SmoothCanvas';

export default SmoothCanvas;