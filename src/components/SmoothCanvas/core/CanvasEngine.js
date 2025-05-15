// src/components/SmoothCanvas/core/CanvasEngine.js

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
  }

  getStrokeOptions(inputType, strokeWidth) {
    // These are the key settings for smooth fast lines
    const baseOptions = {
      size: strokeWidth,
      smoothing: 0.5,    // Medium smoothing - don't over-smooth
      streamline: 0.5,   // Medium streamline - helps with fast movements
      //easing: (t) => t,  // Linear easing
      last: true,        // Process as final stroke
      start: { 
        taper: 0,        // No taper at start
        cap: true 
      },
      end: { 
        taper: strokeWidth * 0.75,  // Small taper at end
        cap: true 
      }
    };

    if (inputType === 'pen') {
      return {
        ...baseOptions,
        thinning: 0.3,              // Moderate pen pressure response
        simulatePressure: false,    // Use real pressure
        smoothing: 0.3,             // Less smoothing for pen precision
        streamline: 0.9,            // More streamline for pen smoothness
      };
    } else {
      return {
        ...baseOptions,
        thinning: 0.3,              // Less pressure variation for mouse
        simulatePressure: true,     // Simulate pressure for mouse
        smoothing: 0.5,             // Medium smoothing for mouse
        streamline: 0.5,            // Medium streamline for mouse
      };
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
      // Handle case where tablet reports 0 pressure (like Xiaomi tablets)
      if (pressure === 0) {
        pressure = 0.5; // Default pressure
        this.inputType = 'mouse'; // Fall back to mouse simulation
      }
      pressure = Math.max(0.1, Math.min(1.0, pressure));
    } else if (type === 'touch') {
      pressure = 0.6;
    } else {
      pressure = 0.8;
    }

    return [x, y, pressure];
  }

  createSmoothEnding(points) {
    if (points.length < 2) return points;
    
    const smoothPoints = [...points];
    
    // Simple ending - just ensure the last point has the right pressure
    if (smoothPoints.length > 0) {
      const lastPoint = smoothPoints[smoothPoints.length - 1];
      // Gradually reduce pressure for the last few points if there are enough
      const taperPoints = Math.min(3, Math.floor(smoothPoints.length * 0.1));
      
      for (let i = taperPoints; i > 0; i--) {
        const index = smoothPoints.length - i;
        if (index >= 0 && index < smoothPoints.length) {
          const t = i / taperPoints;
          smoothPoints[index][2] = lastPoint[2] * (1 - t * 0.7);
        }
      }
    }
    
    return smoothPoints;
  }

  calculateBoundingBox(pathData) {
    const coords = pathData.match(/(-?\d+(?:\.\d+)?)/g);
    if (!coords || coords.length < 4) {
      return null;
    }

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

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
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

  addPath(pathData, color, strokeWidth, inputType) {
    const newPath = {
      id: this.nextPathId,
      pathData,
      color,
      type: 'stroke',
      inputType,
      strokeWidth
    };
    
    const bbox = this.calculateBoundingBox(pathData);
    if (bbox) {
      this.pathBBoxes.set(this.nextPathId, bbox);
    }
    
    this.paths.push(newPath);
    this.nextPathId++;
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

  exportAsDataUrl(format = 'png') {
    const svg = this.svgRef.current;
    if (!svg) return Promise.resolve('');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = this.options.width * this.dpr;
    canvas.height = this.options.height * this.dpr;
    ctx.scale(this.dpr, this.dpr);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.options.width, this.options.height);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise(resolve => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, this.options.width, this.options.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL(`image/${format}`, 0.98));
      };
      img.src = url;
    });
  }

  // Getters
  getPaths() {
    return this.paths;
  }

  getPathsToErase() {
    return this.pathsToErase;
  }

  getCurrentPath() {
    return this.currentPath;
  }

  // Setters
  setPathsToErase(pathsToErase) {
    this.pathsToErase = pathsToErase;
  }

  setCurrentPath(path) {
    this.currentPath = path;
  }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  // Clean up
  destroy() {
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.pathBBoxes.clear();
  }
}