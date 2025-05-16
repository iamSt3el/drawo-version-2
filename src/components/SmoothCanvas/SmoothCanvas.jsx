// src/components/SmoothCanvas/SmoothCanvas.jsx - Fixed to prevent infinite loading
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
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // Add loading state

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
        if (onCanvasChange && !isLoadingData) { // Don't trigger save during loading
          const vectorData = engine.exportAsJSON();
          onCanvasChange(vectorData);
        }
      },
      onPathsErased: () => {
        setPaths([...engine.getPaths()]);
        if (onCanvasChange && !isLoadingData) { // Don't trigger save during loading
          const vectorData = engine.exportAsJSON();
          onCanvasChange(vectorData);
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
    setCanvasInitialized(true);

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
    if (engineRef.current && eventHandlerRef.current && canvasInitialized) {
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
  }, [currentTool, strokeColor, strokeWidth, eraserWidth, canvasInitialized]);

  // Load drawing data from JSON (vector data) - Fixed to prevent infinite loops
  const loadDrawingData = (vectorData) => {
    if (!vectorData || !engineRef.current || isLoadingData) {
      console.log('Cannot load drawing data: missing data, engine, or already loading');
      return;
    }
    
    setIsLoadingData(true); // Prevent save callbacks during loading
    
    try {
      console.log('Loading vector drawing data...');
      const success = engineRef.current.importFromJSON(vectorData);
      
      if (success) {
        // Update state to trigger re-render
        setPaths([...engineRef.current.getPaths()]);
        console.log('Vector drawing data loaded successfully');
      } else {
        console.error('Failed to load vector drawing data');
      }
    } catch (error) {
      console.error('Error loading vector drawing data:', error);
    } finally {
      // Add longer delay to prevent immediate re-saving
      setTimeout(() => {
        setIsLoadingData(false);
      }, 500); // Increased delay
    }
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

        if (onCanvasChange && !isLoadingData) {
          setTimeout(() => {
            const vectorData = engineRef.current.exportAsJSON();
            onCanvasChange(vectorData);
          }, 10);
        }
      }
    },
    undo: () => {
      if (engineRef.current) {
        const success = engineRef.current.undo();
        if (success) {
          setPaths([...engineRef.current.getPaths()]);
          if (onCanvasChange && !isLoadingData) {
            setTimeout(() => {
              const vectorData = engineRef.current.exportAsJSON();
              onCanvasChange(vectorData);
            }, 10);
          }
        }
        return success;
      }
      return false;
    },
    // Updated to load vector data instead of image data
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
          zIndex: 2, // Above SVG to capture events
          pointerEvents: 'auto' // Canvas handles drawing events
        }}
      />

      {/* SVG for vector drawing - renders the paths */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        style={{
          pointerEvents: 'none', // SVG doesn't handle events, just renders
          shapeRendering: 'geometricPrecision',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1 // Below canvas
        }}
      >
        {/* Render paths as SVG elements */}
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