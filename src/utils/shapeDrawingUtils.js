// src/utils/shapeDrawingUtils.js - Simplified shape drawing utilities
import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing shape drawing state and functions
 * @param {Object} options - Configuration options
 * @param {Function} options.onShapeComplete - Callback when shape is completed
 * @param {Object} options.canvasRef - Reference to the canvas component
 * @param {string} options.strokeColor - Current stroke color
 * @param {number} options.strokeWidth - Current stroke width
 * @param {number} options.opacity - Current opacity
 * @param {boolean} options.sketchyMode - Whether sketchy mode is enabled
 * @returns {Object} Shape drawing state and functions
 */
export const useShapeDrawing = ({
  onShapeComplete,
  canvasRef,
  strokeColor,
  strokeWidth,
  opacity,
  sketchyMode
}) => {
  // States for shape drawing
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPoint, setShapeStartPoint] = useState(null);
  const [shapeEndPoint, setShapeEndPoint] = useState(null);
  const [temporaryShape, setTemporaryShape] = useState(null);
  const [shapeProperties, setShapeProperties] = useState({
    fill: false,           // Whether the shape should be filled
    fillColor: '#000000',  // Fill color (can be the same as stroke initially)
    fillOpacity: 20,       // Fill opacity (lower than stroke opacity by default)
  });
  
  // Ref to track keyboard modifiers
  const keyModifiersRef = useRef({
    shift: false,    // For perfect squares/circles
    alt: false,      // For drawing from center
    ctrl: false,     // For additional features
  });
  
  // Set up event listeners for keyboard modifiers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey) keyModifiersRef.current.shift = true;
      if (e.altKey) keyModifiersRef.current.alt = true;
      if (e.ctrlKey || e.metaKey) keyModifiersRef.current.ctrl = true;
      
      // Force redraw if currently drawing a shape
      if (isDrawingShape && shapeEndPoint) {
        updateTemporaryShape(shapeStartPoint, shapeEndPoint);
      }
      
      // Handle escape key to cancel drawing
      if (e.key === 'Escape' && isDrawingShape) {
        setIsDrawingShape(false);
        setTemporaryShape(null);
      }
    };
    
    const handleKeyUp = (e) => {
      if (!e.shiftKey) keyModifiersRef.current.shift = false;
      if (!e.altKey) keyModifiersRef.current.alt = false;
      if (!e.ctrlKey && !e.metaKey) keyModifiersRef.current.ctrl = false;
      
      // Force redraw if currently drawing a shape
      if (isDrawingShape && shapeEndPoint) {
        updateTemporaryShape(shapeStartPoint, shapeEndPoint);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDrawingShape, shapeStartPoint, shapeEndPoint]);
  
  /**
   * Calculate shape dimensions based on start and end points
   * Handles keyboard modifiers for constrained shapes
   */
  const calculateShapeDimensions = useCallback((start, end, shapeType) => {
    if (!start || !end) return null;
    
    let x, y, width, height;
    
    // Handle special cases for different shape types
    if (shapeType === 'line') {
      // For lines, we just need start and end points
      let x1 = start.x;
      let y1 = start.y;
      let x2 = end.x;
      let y2 = end.y;
      
      // Make horizontal/vertical line when shift is pressed
      if (keyModifiersRef.current.shift) {
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        
        if (dx > dy) {
          // Horizontal line
          y2 = start.y;
        } else {
          // Vertical line
          x2 = start.x;
        }
      }
      
      return { x1, y1, x2, y2 };
    }
    
    // For rectangular shapes (rectangle, circle, ellipse, etc.)
    if (keyModifiersRef.current.shift) {
      // Make perfect square/circle when shift is pressed
      const size = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
      
      // Maintain direction
      if (end.x < start.x) {
        x = start.x - size;
      } else {
        x = start.x;
      }
      
      if (end.y < start.y) {
        y = start.y - size;
      } else {
        y = start.y;
      }
      
      width = size;
      height = size;
    } else {
      // Normal rectangle/ellipse
      if (end.x < start.x) {
        x = end.x;
        width = start.x - end.x;
      } else {
        x = start.x;
        width = end.x - start.x;
      }
      
      if (end.y < start.y) {
        y = end.y;
        height = start.y - end.y;
      } else {
        y = start.y;
        height = end.y - start.y;
      }
    }
    
    // Draw from center when alt is pressed
    if (keyModifiersRef.current.alt) {
      const centerX = start.x;
      const centerY = start.y;
      
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      
      x = centerX - halfWidth;
      y = centerY - halfHeight;
    }
    
    // Ensure minimum dimensions
    width = Math.max(width, 1);
    height = Math.max(height, 1);
    
    return { x, y, width, height };
  }, []);
  
  /**
   * Update temporary shape based on current points and tool
   */
  const updateTemporaryShape = useCallback((start, end, currentTool) => {
    if (!start || !end || !currentTool) {
      setTemporaryShape(null);
      return;
    }
    
    // Line tool needs different handling
    if (currentTool === 'line') {
      const linePoints = calculateShapeDimensions(start, end, 'line');
      if (!linePoints) return;
      
      const lineData = {
        type: 'line',
        x1: linePoints.x1,
        y1: linePoints.y1,
        x2: linePoints.x2,
        y2: linePoints.y2,
        color: strokeColor,
        strokeWidth,
        opacity,
        sketchyMode
      };
      
      setTemporaryShape(lineData);
      return;
    }
    
    // Other shapes use the standard dimension calculation
    const dimensions = calculateShapeDimensions(start, end, currentTool);
    if (!dimensions) return;
    
    const { x, y, width, height } = dimensions;
    
    // Create shape data based on current tool
    const shapeData = {
      type: currentTool,
      x, y, width, height,
      color: strokeColor,
      strokeWidth,
      opacity,
      sketchyMode,
      fill: shapeProperties.fill,
      fillColor: shapeProperties.fillColor,
      fillOpacity: shapeProperties.fillOpacity
    };
    
    setTemporaryShape(shapeData);
  }, [strokeColor, strokeWidth, opacity, sketchyMode, shapeProperties, calculateShapeDimensions]);
  
  /**
   * Handle canvas mouse down event to start shape drawing
   */
  const handleCanvasMouseDown = useCallback((e, currentTool) => {
    const shapeTools = ['rectangle', 'circle', 'ellipse', 'line', 'triangle', 'star'];
    
    if (!shapeTools.includes(currentTool)) {
      return; // Not a shape tool, don't handle
    }
    
    // Get coordinates relative to canvas
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Start drawing shape
    setIsDrawingShape(true);
    setShapeStartPoint({ x, y });
    setShapeEndPoint({ x, y }); // Initially same as start
    
    // Update temporary shape
    updateTemporaryShape({ x, y }, { x, y }, currentTool);
  }, [updateTemporaryShape]);
  
  /**
   * Handle canvas mouse move event during shape drawing
   */
  const handleCanvasMouseMove = useCallback((e, currentTool) => {
    if (!isDrawingShape) return;
    
    // Get coordinates relative to canvas
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update end point
    setShapeEndPoint({ x, y });
    
    // Update temporary shape
    updateTemporaryShape(shapeStartPoint, { x, y }, currentTool);
  }, [isDrawingShape, shapeStartPoint, updateTemporaryShape]);
  
  /**
   * Handle canvas mouse up event to finalize shape drawing
   */
  const handleCanvasMouseUp = useCallback((e, currentTool) => {
    if (!isDrawingShape) return;
    
    // Get coordinates relative to canvas
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update end point one last time
    setShapeEndPoint({ x, y });
    
    // Update temporary shape one last time to ensure consistency
    updateTemporaryShape(shapeStartPoint, { x, y }, currentTool);
    
    // Only finalize if we've moved enough (prevents accidental dots)
    const minDistance = 3; // Minimum distance to consider a valid shape
    const distance = Math.sqrt(
      Math.pow(x - shapeStartPoint.x, 2) + 
      Math.pow(y - shapeStartPoint.y, 2)
    );
    
    if (distance >= minDistance || currentTool === 'line') {
      // Finalize the shape
      const finalShape = temporaryShape;
      
      // Add the shape to the canvas if we have a valid shape
      if (canvasRef?.current && finalShape && canvasRef.current.addShape) {
        canvasRef.current.addShape(finalShape);
        
        // Trigger callback for shape completion
        if (onShapeComplete) {
          onShapeComplete(finalShape);
        }
      } else if (canvasRef?.current && finalShape) {
        console.warn('Canvas reference does not have addShape method');
      }
    }
    
    // Reset drawing state
    setIsDrawingShape(false);
    setTemporaryShape(null);
  }, [isDrawingShape, shapeStartPoint, temporaryShape, canvasRef, updateTemporaryShape, onShapeComplete]);
  
  /**
   * Handle fill toggle for shapes
   */
  const handleFillToggle = useCallback((fill) => {
    setShapeProperties(prev => ({
      ...prev,
      fill
    }));
  }, []);
  
  /**
   * Handle fill color change for shapes
   */
  const handleFillColorChange = useCallback((color) => {
    setShapeProperties(prev => ({
      ...prev,
      fillColor: color
    }));
  }, []);
  
  /**
   * Handle fill opacity change for shapes
   */
  const handleFillOpacityChange = useCallback((opacity) => {
    setShapeProperties(prev => ({
      ...prev,
      fillOpacity: opacity
    }));
  }, []);
  
  /**
   * Reset all shape drawing state
   */
  const resetShapeDrawing = useCallback(() => {
    setIsDrawingShape(false);
    setShapeStartPoint(null);
    setShapeEndPoint(null);
    setTemporaryShape(null);
  }, []);
  
  return {
    // State
    isDrawingShape,
    shapeStartPoint,
    shapeEndPoint,
    temporaryShape,
    shapeProperties,
    
    // Handlers
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleFillToggle,
    handleFillColorChange,
    handleFillOpacityChange,
    resetShapeDrawing,
    
    // Setters
    setShapeProperties
  };
};

/**
 * Check if a tool is a shape tool
 * @param {string} tool - The current tool
 * @returns {boolean} True if it's a shape tool
 */
export const isShapeTool = (tool) => {
  const shapeTools = ['rectangle', 'circle', 'ellipse', 'line', 'triangle', 'star'];
  return shapeTools.includes(tool);
};

/**
 * Get appropriate cursor for the current tool
 * @param {string} tool - The current tool
 * @returns {string} CSS cursor value
 */
export const getToolCursor = (tool) => {
  if (isShapeTool(tool)) {
    return 'crosshair';
  }
  
  switch (tool) {
    case 'pen':
    case 'pencil':
    case 'brush':
      return 'crosshair';
    case 'eraser':
      return 'none'; // Custom eraser cursor is used
    case 'hand':
      return 'grab';
    case 'text':
      return 'text';
    default:
      return 'default';
  }
};