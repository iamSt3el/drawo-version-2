// src/components/SmoothCanvas/SmoothCanvas.jsx - Simple Excalidraw-style implementation
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize canvas engine
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

    // Simple callbacks - trigger save on any change
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
        setPaths([...engine.getPaths()]);
        if (onCanvasChange && isInitialized) {
          onCanvasChange(engine.exportAsJSON());
        }
      },
      onPathsErased: () => {
        setPaths([...engine.getPaths()]);
        if (onCanvasChange && isInitialized) {
          onCanvasChange(engine.exportAsJSON());
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

    eventHandler.attachListeners(canvasRef.current);

    engineRef.current = engine;
    eventHandlerRef.current = eventHandler;
    rendererRef.current = renderer;
    setIsInitialized(true);

    return () => {
      if (eventHandlerRef.current && canvasRef.current) {
        eventHandlerRef.current.detachListeners(canvasRef.current);
      }
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [width, height]);

  // Update options when props change
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current && isInitialized) {
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

      engineRef.current.isErasing = currentTool === 'eraser';
      
      if (currentTool !== 'eraser') {
        setPathsToErase(new Set());
        setShowEraser(false);
      }
    }
  }, [currentTool, strokeColor, strokeWidth, eraserWidth, isInitialized]);

  // Simple load function
  const loadDrawingData = (vectorData) => {

    
    if (!engineRef.current || !vectorData) {
    
      return false;
    }
    

    
    try {
      // Temporarily disable callbacks to prevent save during load
      setIsInitialized(false);
      
      
      const success = engineRef.current.importFromJSON(vectorData);
    
      
      if (success) {
        const currentPaths = engineRef.current.getPaths();
  
        
        setPaths([...currentPaths]);
      
      }
      // Re-enable callbacks after a short delay
      setTimeout(() => {
        setIsInitialized(true);
    
      }, 100);
      
      return success;
    } catch (error) {
      console.error('Error loading drawing data:', error);
      setIsInitialized(true);
      return false;
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    exportImage: async (format = 'png') => {
      if (engineRef.current) {
        return engineRef.current.exportAsDataUrl(format, true);
      }
      return '';
    },
    exportJSON: () => {
      if (engineRef.current) {
        return engineRef.current.exportAsJSON();
      }
      return null;
    },
    exportSVG: () => {
      if (engineRef.current) {
        return engineRef.current.exportAsSVG();
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

        // Trigger save after clear
        if (onCanvasChange && isInitialized) {
          setTimeout(() => {
            onCanvasChange(engineRef.current.exportAsJSON());
          }, 10);
        }
      }
    },
    undo: () => {
      if (engineRef.current) {
        const success = engineRef.current.undo();
        if (success) {
          setPaths([...engineRef.current.getPaths()]);
          // Trigger save after undo
          if (onCanvasChange && isInitialized) {
            setTimeout(() => {
              onCanvasChange(engineRef.current.exportAsJSON());
            }, 10);
          }
        }
        return success;
      }
      return false;
    },
    loadCanvasData: loadDrawingData,
    loadDrawingData: loadDrawingData
  }));

  const dpr = window.devicePixelRatio || 1;

  return (
    <div
      className={`${styles.canvasContainer} ${styles[`${currentTool}Mode`]}`}
      style={{ width, height }}
    >
      {/* Background layers */}
      {backgroundImageUrl && rendererRef.current?.renderBackgroundImage(backgroundImageUrl, width, height)}
      
      {/* Canvas - handles all drawing events */}
      <canvas
        ref={canvasRef}
        width={width * dpr}
        height={height * dpr}
        className={styles.canvas}
        style={{
          touchAction: 'none',
          width: `${width}px`,
          height: `${height}px`,
          background: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: 'auto'
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
          shapeRendering: 'geometricPrecision',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      >
        {/* Debug: Show how many paths we have */}
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