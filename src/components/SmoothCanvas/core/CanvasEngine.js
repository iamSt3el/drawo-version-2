// src/components/SmoothCanvas/core/CanvasEngine.js - Simple Excalidraw-style engine
import rough from 'roughjs'

export class CanvasEngine {
  constructor(canvasRef, svgRef, options = {}) {
    this.canvasRef = canvasRef;
    this.svgRef = svgRef;
    this.options = {
      width: 900,
      height: 700,
      strokeColor: '#000000',
      strokeWidth: 5,
      eraserWidth: 10,
      sketechyMode: false,
      ...options
    };
    
    this.isDrawing = false;
    this.currentPath = [];
    this.paths = [];
    this.isErasing = false;
    this.lastPoint = null;
    this.inputType = 'mouse';
    this.eraserPosition = { x: 0, y: 0 };
    this.showEraser = false;
    this.activePointer = null;
    this.startTime = null;
    this.frameRequest = null;
    this.nextPathId = 0;
    this.pathsToErase = new Set();
    this.pathBBoxes = new Map();
    
    // Initialize Rough.js generator
    this.roughGenerator = rough.generator();
    
    this.dpr = window.devicePixelRatio || 1;
    this.initializeCanvas();
  }

  initializeCanvas() {
    if (!this.canvasRef.current) return;
    
    const canvas = this.canvasRef.current;
    canvas.width = this.options.width * this.dpr;
    canvas.height = this.options.height * this.dpr;
    canvas.style.width = `${this.options.width}px`;
    canvas.style.height = `${this.options.height}px`;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Add new method to create and add a shape
  addShape(shapeData) {
    let pathData;
    let svgNode;
    
    // Generate the shape path using Rough.js
    const roughOptions = {
      seed: this.nextPathId, // Use for consistent randomness
      stroke: shapeData.color || this.options.strokeColor,
      strokeWidth: shapeData.strokeWidth || this.options.strokeWidth,
      roughness: this.options.sketchyMode ? 1.5 : 0.5,
      bowing: this.options.sketchyMode ? 1 : 0,
      fill: shapeData.fill ? shapeData.fillColor : undefined,
      fillStyle: 'solid',
      fillWeight: 0.5,
      hachureGap: 8,
      opacity: shapeData.opacity / 100 || 1
    };
    
    try {
      // Create different shapes based on type
      switch (shapeData.type) {
        case 'rectangle':
          svgNode = this.roughGenerator.rectangle(
            shapeData.x,
            shapeData.y,
            shapeData.width,
            shapeData.height,
            roughOptions
          );
          break;
          
        case 'circle':
          // For circle, we need center coordinates and diameter
          const centerX = shapeData.x + shapeData.width / 2;
          const centerY = shapeData.y + shapeData.height / 2;
          const diameter = Math.max(shapeData.width, shapeData.height);
          
          svgNode = this.roughGenerator.circle(
            centerX,
            centerY,
            diameter,
            roughOptions
          );
          break;
          
        case 'ellipse':
          // For ellipse, we need center coordinates and dimensions
          const ellipseCenterX = shapeData.x + shapeData.width / 2;
          const ellipseCenterY = shapeData.y + shapeData.height / 2;
          
          svgNode = this.roughGenerator.ellipse(
            ellipseCenterX,
            ellipseCenterY,
            shapeData.width,
            shapeData.height,
            roughOptions
          );
          break;
          
        case 'line':
          svgNode = this.roughGenerator.line(
            shapeData.x1,
            shapeData.y1,
            shapeData.x2,
            shapeData.y2,
            roughOptions
          );
          break;
          
        case 'triangle':
          // For triangle, create a polygon with 3 points
          const points = [
            [shapeData.x + shapeData.width / 2, shapeData.y], // Top
            [shapeData.x, shapeData.y + shapeData.height],    // Bottom left
            [shapeData.x + shapeData.width, shapeData.y + shapeData.height] // Bottom right
          ];
          
          svgNode = this.roughGenerator.polygon(points, roughOptions);
          break;
          
        default:
          console.warn('Unsupported shape type:', shapeData.type);
          return null;
      }
      
      // Convert SVG node to path data for storage
      if (svgNode) {
        // Here we need to extract path data from the SVG node
        // This is simplified and may need adjustment based on Rough.js output
        pathData = this.getSvgPathFromRoughShape(svgNode);
        
        // Add the shape as a path
        const newPath = {
          id: this.generatePathId(),
          pathData: pathData,
          color: shapeData.color || this.options.strokeColor,
          type: 'shape',
          shapeType: shapeData.type,
          originalShape: shapeData, // Store original shape data for potential editing
          strokeWidth: shapeData.strokeWidth || this.options.strokeWidth,
          timestamp: Date.now(),
          sketchyMode: this.options.sketchyMode
        };
        
        const bbox = this.calculateBoundingBox(pathData);
        if (bbox) {
          this.pathBBoxes.set(newPath.id, bbox);
        }
        
        this.paths.push(newPath);
        return newPath;
      }
    } catch (error) {
      console.error('Error creating shape:', error);
      return null;
    }
  }
  

  getStrokeOptions(inputType, strokeWidth) {
    const baseOptions = {
      size: strokeWidth,
      smoothing: 0.5,
      streamline: 0.5,
      last: true,
      start: { taper: 0, cap: true },
      end: { taper: strokeWidth * 0, cap: true }
    };

    if (inputType === 'pen') {
      return {
        ...baseOptions,
        thinning: 0.3,
        simulatePressure: false,
        smoothing: 0.3,
        streamline: 0.9,
      };
    } else {
      return {
        ...baseOptions,
        thinning: 0.3,
        simulatePressure: true,
        smoothing: 0.5,
        streamline: 0.5,
      };
    }
  }

  // Helper method to convert a Rough.js shape to SVG path data
  getSvgPathFromRoughShape(roughShape) {
    try {
      // This is a simplified approach
      if (roughShape.d) {
        // Some rough shapes provide a direct path
        return roughShape.d;
      } else if (roughShape.sets && roughShape.sets.length > 0) {
        // For more complex shapes, we may need to extract path data from the sets
        let pathData = '';
        
        // Process each set of operations
        roughShape.sets.forEach(set => {
          if (set.ops && set.ops.length > 0) {
            // Process path operations
            set.ops.forEach(op => {
              // Convert operation to SVG path command
              if (op.op === 'move') {
                pathData += `M ${op.data[0]} ${op.data[1]} `;
              } else if (op.op === 'lineTo') {
                pathData += `L ${op.data[0]} ${op.data[1]} `;
              } else if (op.op === 'bcurveTo') {
                // Bezier curve with 6 parameters
                pathData += `C ${op.data[0]} ${op.data[1]}, ${op.data[2]} ${op.data[3]}, ${op.data[4]} ${op.data[5]} `;
              } else if (op.op === 'qcurveTo') {
                // Quadratic curve
                pathData += `Q ${op.data[0]} ${op.data[1]}, ${op.data[2]} ${op.data[3]} `;
              }
            });
          }
        });
        
        // Ensure path is closed if needed
        if (pathData && !pathData.endsWith('Z')) {
          pathData += 'Z';
        }
        
        return pathData;
      }
      
      // If we can't extract a path, create a placeholder
      console.warn('Could not extract path data from rough shape');
      return '';
    } catch (error) {
      console.error('Error converting rough shape to path data:', error);
      return '';
    }
  }

  getSvgPathFromStroke(stroke) {
    if (!stroke.length) return '';

    const d = [];
    const [first, ...rest] = stroke;
    d.push('M', first[0].toFixed(2), first[1].toFixed(2));

    for (const [x, y] of rest) {
      d.push('L', x.toFixed(2), y.toFixed(2));
    }

    d.push('Z');
    return d.join(' ');
  }

  getPointFromEvent(e) {
    const rect = this.canvasRef.current.getBoundingClientRect();
    const type = e.pointerType || 'mouse';
    if (type !== this.inputType) {
      this.inputType = type;
    }

    const x = (e.clientX - rect.left) / rect.width * this.options.width;
    const y = (e.clientY - rect.top) / rect.height * this.options.height;
    
    let pressure = 0.5;
    
    if (type === 'pen') {
      pressure = e.pressure || 0.5;
      if (pressure === 0) {
        pressure = 0.5;
        this.inputType = 'mouse';
      }
      pressure = Math.max(0.1, Math.min(1.0, pressure));
    } else if (type === 'touch') {
      pressure = 0.6;
    } else {
      pressure = 0.8;
    }

    return [x, y, pressure];
  }

  calculateBoundingBox(pathData) {
    const coords = pathData.match(/(-?\d+(?:\.\d+)?)/g);
    if (!coords || coords.length < 4) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (let i = 0; i < coords.length - 1; i += 2) {
      const x = parseFloat(coords[i]);
      const y = parseFloat(coords[i + 1]);
      
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  eraserIntersectsBoundingBox(eraserX, eraserY, eraserRadius, bbox) {
    const expandedBbox = {
      x: bbox.x - eraserRadius,
      y: bbox.y - eraserRadius,
      width: bbox.width + 2 * eraserRadius,
      height: bbox.height + 2 * eraserRadius
    };

    return eraserX >= expandedBbox.x && 
           eraserX <= expandedBbox.x + expandedBbox.width &&
           eraserY >= expandedBbox.y && 
           eraserY <= expandedBbox.y + expandedBbox.height;
  }

  normalizeColor(color) {
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      return color;
    }
    return color;
  }

  generatePathId() {
    return `path-${Date.now()}-${this.nextPathId++}`;
  }

  addPath(pathData, color, strokeWidth, inputType, inputPoints = []) {
    const newPath = {
      id: this.generatePathId(),
      pathData,
      color: this.normalizeColor(color),
      type: 'stroke',
      inputType,
      strokeWidth,
      inputPoints,
      timestamp: Date.now()
    };
    
    const bbox = this.calculateBoundingBox(pathData);
    if (bbox) {
      this.pathBBoxes.set(newPath.id, bbox);
    }
    
    this.paths.push(newPath);
    return newPath;
  }

  clearPaths() {
    this.paths = [];
    this.pathBBoxes.clear();
    this.currentPath = [];
    this.pathsToErase.clear();
    this.nextPathId = 0;
  }

  undo() {
    if (this.paths.length === 0) return false;
    
    const lastPath = this.paths.pop();
    if (lastPath && lastPath.id !== undefined) {
      this.pathBBoxes.delete(lastPath.id);
    }
    return true;
  }

  // Update exportAsJSON to include shape information
  exportAsJSON() {
    return JSON.stringify({
      type: 'drawing',
      version: 1,
      elements: this.paths.map(path => ({
        id: path.id,
        type: path.type,
        shapeType: path.shapeType,
        pathData: path.pathData,
        color: path.color,
        strokeWidth: path.strokeWidth,
        originalShape: path.originalShape,
        inputType: path.inputType,
        inputPoints: path.inputPoints,
        timestamp: path.timestamp,
        sketchyMode: path.sketchyMode
      })),
      appState: {
        width: this.options.width,
        height: this.options.height,
        sketchyMode: this.options.sketchyMode
      }
    });
  }

  // Simple import function
  importFromJSON(jsonData) {
    
    if (!jsonData) {
      return true;
    }

    try {
      let data;
      
      // Parse JSON if string
      if (typeof jsonData === 'string') {
        
        // Skip empty strings and non-JSON
        if (!jsonData.trim() || !jsonData.trim().startsWith('{')) {
          return true;
        }
        
        try {
          data = JSON.parse(jsonData);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return false;
        }
      } else {
        data = jsonData;
      }


      // Validate structure
      if (!data || !data.elements) {
        return true;
      }


      // Clear existing paths
      this.clearPaths();

      // Import elements
      data.elements.forEach(element => {
        if (element.type === 'shape' && element.pathData) {
          // Import shape
          const newPath = {
            id: this.generatePathId(),
            pathData: element.pathData,
            color: element.color || '#000000',
            type: 'shape',
            shapeType: element.shapeType,
            originalShape: element.originalShape,
            strokeWidth: element.strokeWidth || 5,
            timestamp: element.timestamp || Date.now(),
            sketchyMode: element.sketchyMode || false
          };
          
          const bbox = this.calculateBoundingBox(element.pathData);
          if (bbox) {
            this.pathBBoxes.set(newPath.id, bbox);
          }
          
          this.paths.push(newPath);
        } else if (element.type === 'stroke' && element.pathData) {
          // Existing stroke import logic...
          // (Retain your current code for handling stroke elements)
        }
      });


       // Update options if provided
       if (data.appState) {
        this.updateOptions({
          width: data.appState.width || this.options.width,
          height: data.appState.height || this.options.height,
          sketchyMode: data.appState.sketchyMode !== undefined ? 
            data.appState.sketchyMode : this.options.sketchyMode
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
  // Export as SVG
  exportAsSVG() {
    const svg = this.svgRef.current;
    if (!svg) return '';

    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute('viewBox', `0 0 ${this.options.width} ${this.options.height}`);
    svgClone.setAttribute('width', this.options.width);
    svgClone.setAttribute('height', this.options.height);
    
    const paths = svgClone.querySelectorAll('path');
    paths.forEach((path, index) => {
      if (this.paths[index] && this.paths[index].color) {
        path.setAttribute('fill', this.paths[index].color);
        path.setAttribute('stroke', 'none');
      }
    });

    return new XMLSerializer().serializeToString(svgClone);
  }

  // Export as data URL
  exportAsDataUrl(format = 'png', transparent = true) {
    return new Promise(resolve => {
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');

      exportCanvas.width = this.options.width * this.dpr;
      exportCanvas.height = this.options.height * this.dpr;
      exportCtx.scale(this.dpr, this.dpr);

      if (!transparent && format !== 'png') {
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, this.options.width, this.options.height);
      }

      const svgData = this.exportAsSVG();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        exportCtx.drawImage(img, 0, 0, this.options.width, this.options.height);
        URL.revokeObjectURL(url);
        const quality = format === 'jpeg' ? 0.98 : undefined;
        resolve(exportCanvas.toDataURL(`image/${format}`, quality));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    });
  }

  // Getters
  getPaths() { return this.paths; }
  getPathsToErase() { return this.pathsToErase; }
  getCurrentPath() { return this.currentPath; }

  // Setters
  setPathsToErase(pathsToErase) { this.pathsToErase = pathsToErase; }
  setCurrentPath(path) { this.currentPath = path; }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    if (newOptions.width || newOptions.height) {
      this.initializeCanvas();
    }
  }

  destroy() {
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.pathBBoxes.clear();
  }
}