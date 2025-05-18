// src/utils/shapeDrawingUtils.js
// Complete file with all required exports

import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing shape drawing state and functions
 * @param {Object} options - Configuration options
 * @param {Function} options.onShapeComplete - Callback when shape is completed
 * @param {Function} options.canvasRef - Reference to the canvas component
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
      width = size * Math.sign(end.x - start.x) || size; // Ensure non-zero
      height = size * Math.sign(end.y - start.y) || size; // Ensure non-zero
      
      x = start.x;
      y = start.y;
    } else {
      // Normal rectangle/ellipse
      x = Math.min(start.x, end.x);
      y = Math.min(start.y, end.y);
      width = Math.abs(end.x - start.x);
      height = Math.abs(end.y - start.y);
      
      // Ensure correct sign when drawing backward
      if (end.x < start.x) {
        width = -width;
      }
      if (end.y < start.y) {
        height = -height;
      }
    }
    
    if (keyModifiersRef.current.alt) {
      // Draw from center when alt is pressed
      const centerX = start.x;
      const centerY = start.y;
      
      // When alt is pressed, the start point becomes the center
      if (width >= 0) {
        x = centerX - width / 2;
      } else {
        x = centerX + width / 2;
        width = -width;
      }
      
      if (height >= 0) {
        y = centerY - height / 2;
      } else {
        y = centerY + height / 2;
        height = -height;
      }
    }
    
    // Ensure minimum size for visibility
    width = Math.max(Math.abs(width), 1);
    height = Math.max(Math.abs(height), 1);
    
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
      return;
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
    
    // Finalize the shape
    const finalShape = temporaryShape;
    
    // Add the shape to the canvas if we have a valid shape
    if (canvasRef?.current && finalShape) {
      canvasRef.current.addShape(finalShape);
      
      // Trigger callback for shape completion
      if (onShapeComplete) {
        onShapeComplete(finalShape);
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

/**
 * Get shape tool icon based on shape type
 * @param {string} shapeType - The shape type
 * @param {Object} Icons - Object containing icon components
 * @returns {Component} The icon component
 */
export const getShapeIcon = (shapeType, Icons) => {
  switch (shapeType) {
    case 'rectangle':
      return Icons.Square;
    case 'circle':
      return Icons.Circle;
    case 'ellipse':
      return Icons.Circle; // Usually the same icon as circle
    case 'line':
      return Icons.Minus;
    case 'triangle':
      return Icons.Triangle;
    case 'star':
      return Icons.Star;
    default:
      return Icons.Square; // Default
  }
};

/**
 * Helper function to create SVG path data for various shapes
 * Used for creating SVG paths directly without Rough.js
 * @param {Object} shape - The shape data
 * @returns {string} SVG path data
 */
export const createSvgPathForShape = (shape) => {
  if (!shape) return '';
  
  let centerX, centerY, radius, radiusX, radiusY;
  
  switch (shape.type) {
    case 'rectangle':
      return `M ${shape.x} ${shape.y} h ${shape.width} v ${shape.height} h ${-shape.width} Z`;
      
    case 'circle':
      centerX = shape.x + shape.width / 2;
      centerY = shape.y + shape.height / 2;
      radius = Math.max(shape.width, shape.height) / 2;
      
      // SVG circle as path
      return `M ${centerX} ${centerY - radius} 
              A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY} 
              A ${radius} ${radius} 0 0 1 ${centerX} ${centerY + radius} 
              A ${radius} ${radius} 0 0 1 ${centerX - radius} ${centerY} 
              A ${radius} ${radius} 0 0 1 ${centerX} ${centerY - radius} Z`;
              
    case 'ellipse':
      centerX = shape.x + shape.width / 2;
      centerY = shape.y + shape.height / 2;
      radiusX = shape.width / 2;
      radiusY = shape.height / 2;
      
      // SVG ellipse as path
      return `M ${centerX} ${centerY - radiusY} 
              A ${radiusX} ${radiusY} 0 0 1 ${centerX + radiusX} ${centerY} 
              A ${radiusX} ${radiusY} 0 0 1 ${centerX} ${centerY + radiusY} 
              A ${radiusX} ${radiusY} 0 0 1 ${centerX - radiusX} ${centerY} 
              A ${radiusX} ${radiusY} 0 0 1 ${centerX} ${centerY - radiusY} Z`;
              
    case 'line':
      return `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}`;
      
    case 'triangle':
      return `M ${shape.x + shape.width / 2} ${shape.y} 
              L ${shape.x} ${shape.y + shape.height} 
              L ${shape.x + shape.width} ${shape.y + shape.height} 
              Z`;
              
    case 'star':
      // Create a 5-point star
      centerX = shape.x + shape.width / 2;
      centerY = shape.y + shape.height / 2;
      const outerRadius = Math.min(shape.width, shape.height) / 2;
      const innerRadius = outerRadius * 0.4;
      const points = [];
      
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / 5) * i;
        const x = centerX + radius * Math.sin(angle);
        const y = centerY - radius * Math.cos(angle);
        points.push(`${x} ${y}`);
      }
      
      return `M ${points.join(' L ')} Z`;
      
    default:
      return '';
  }
};