// src/components/SmoothCanvas/core/CanvasEngine.js
import { getStroke } from 'perfect-freehand';

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
    
    // Enhanced smoothing properties
    this.smoothingBuffer = [];
    this.lastVelocity = { x: 0, y: 0 };
    this.velocityFilter = 0.4; // Lower = more smoothing
    
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

  // Enhanced stroke options with better curves and pressure handling
  getStrokeOptions(inputType, strokeWidth) {
    const baseOptions = {
      size: strokeWidth,
      smoothing: 0.75, // Increased for smoother curves
      streamline: 0.65, // Better streamlining
      easing: (t) => Math.sin((t * Math.PI) / 2), // Smoother easing
      start: { 
        taper: strokeWidth * 0.25,
        cap: true 
      },
      end: { 
        taper: strokeWidth * 1.5,
        cap: true 
      }
    };

    if (inputType === 'pen') {
      return {
        ...baseOptions,
        thinning: 0.6, // More responsive to pressure
        simulatePressure: false,
        smoothing: 0.85,
        streamline: 0.75,
        start: { 
          taper: strokeWidth * 0.15,
          cap: true 
        },
        end: { 
          taper: strokeWidth * 2,
          cap: true 
        },
        // Add custom pressure curve
        pressureCurve: (pressure) => {
          return Math.min(1, Math.max(0.1, Math.pow(pressure, 0.5)));
        }
      };
    } else {
      return {
        ...baseOptions,
        thinning: 0.5,
        simulatePressure: true,
        smoothing: 0.7,
        streamline: 0.6,
        start: { 
          taper: strokeWidth * 0.3, 
          cap: true 
        },
        end: { 
          taper: strokeWidth * 1.8,
          cap: true 
        }
      };
    }
  }

  getSvgPathFromStroke(stroke) {
    if (!stroke.length) return '';

    const d = [];
    const [first, ...rest] = stroke;
    d.push('M', first[0].toFixed(2), first[1].toFixed(2));

    // Use quadratic curves for smoother paths
    if (rest.length > 0) {
      for (let i = 0; i < rest.length; i++) {
        const [x, y] = rest[i];
        if (i === 0) {
          d.push('L', x.toFixed(2), y.toFixed(2));
        } else if (i < rest.length - 1) {
          const [nextX, nextY] = rest[i + 1];
          const cpX = (x + nextX) / 2;
          const cpY = (y + nextY) / 2;
          d.push('Q', x.toFixed(2), y.toFixed(2), cpX.toFixed(2), cpY.toFixed(2));
        } else {
          d.push('L', x.toFixed(2), y.toFixed(2));
        }
      }
    }

    d.push('Z');
    return d.join(' ');
  }

  // Enhanced point extraction with velocity calculation
  getPointFromEvent(e) {
    const rect = this.canvasRef.current.getBoundingClientRect();
    const type = e.pointerType || 'mouse';
    if (type !== this.inputType) {
      this.inputType = type;
    }

    const x = (e.clientX - rect.left) / rect.width * this.options.width;
    const y = (e.clientY - rect.top) / rect.height * this.options.height;
    
    // Calculate velocity for better pressure simulation
    let velocity = 0;
    if (this.lastPoint) {
      const dx = x - this.lastPoint[0];
      const dy = y - this.lastPoint[1];
      velocity = Math.sqrt(dx * dx + dy * dy);
      
      // Apply velocity filtering for smoother motion
      this.lastVelocity.x = this.lastVelocity.x * this.velocityFilter + dx * (1 - this.velocityFilter);
      this.lastVelocity.y = this.lastVelocity.y * this.velocityFilter + dy * (1 - this.velocityFilter);
    }
    
    let pressure = 0.5;
    
    if (type === 'pen') {
      pressure = e.pressure || 0.5;
      // Enhance pressure sensitivity with velocity consideration
      pressure = Math.max(0.15, Math.min(0.95, pressure));
      // Reduce pressure for very fast movements
      if (velocity > 5) {
        pressure *= Math.max(0.5, 1 - (velocity - 5) / 20);
      }
    } else if (type === 'touch') {
      // Simulate pressure based on velocity for touch
      pressure = Math.max(0.3, Math.min(0.8, 0.6 - velocity / 30));
    } else {
      // Mouse - simulate pressure based on velocity
      pressure = Math.max(0.4, Math.min(1.0, 0.8 - velocity / 25));
    }

    return [x, y, pressure];
  }

  // Improved smoothing with buffer
  getSmoothedPoint(point) {
    this.smoothingBuffer.push(point);
    
    // Keep only recent points for smoothing
    if (this.smoothingBuffer.length > 5) {
      this.smoothingBuffer.shift();
    }
    
    if (this.smoothingBuffer.length < 2) {
      return point;
    }
    
    // Apply weighted average smoothing
    let totalWeight = 0;
    let smoothedX = 0;
    let smoothedY = 0;
    let smoothedPressure = 0;
    
    for (let i = 0; i < this.smoothingBuffer.length; i++) {
      const weight = (i + 1) / this.smoothingBuffer.length; // More weight to recent points
      const [x, y, pressure] = this.smoothingBuffer[i];
      
      smoothedX += x * weight;
      smoothedY += y * weight;
      smoothedPressure += pressure * weight;
      totalWeight += weight;
    }
    
    return [
      smoothedX / totalWeight,
      smoothedY / totalWeight,
      smoothedPressure / totalWeight
    ];
  }

  // Enhanced single point stroke creation
  createSinglePointStroke(point, inputType, strokeWidth, color) {
    const [x, y, pressure] = point;
    const radius = (strokeWidth / 2) * pressure;
    
    // Create a small circle for single points
    const circle = `M ${x - radius},${y} 
                   A ${radius},${radius} 0 1,1 ${x + radius},${y} 
                   A ${radius},${radius} 0 1,1 ${x - radius},${y} Z`;
                   
    // Add slight randomization for more natural feel
    const jitterX = (Math.random() - 0.5) * 0.1;
    const jitterY = (Math.random() - 0.5) * 0.1;
    
    const naturalCircle = `M ${x - radius + jitterX},${y + jitterY} 
                          A ${radius},${radius} 0 1,1 ${x + radius + jitterX},${y + jitterY} 
                          A ${radius},${radius} 0 1,1 ${x - radius + jitterX},${y + jitterY} Z`;
    
    return naturalCircle;
  }

  createSmoothEnding(points) {
    if (points.length < 2) return points;
    
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2] || lastPoint;
    const smoothPoints = [...points];
    
    // Calculate ending direction for natural taper
    const dx = lastPoint[0] - secondLastPoint[0];
    const dy = lastPoint[1] - secondLastPoint[1];
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    const taperSteps = Math.min(4, this.options.strokeWidth / 2);
    
    for (let i = 1; i <= taperSteps; i++) {
      const t = i / (taperSteps + 1);
      const pressure = lastPoint[2] * (1 - t * 0.9);
      
      // Extend slightly in the direction of movement for more natural ending
      let x = lastPoint[0];
      let y = lastPoint[1];
      
      if (magnitude > 0) {
        const normalizedDx = dx / magnitude;
        const normalizedDy = dy / magnitude;
        x += normalizedDx * t * 2;
        y += normalizedDy * t * 2;
      }
      
      smoothPoints.push([x, y, Math.max(0.05, pressure)]);
    }
    
    return smoothPoints;
  }

  // Enhanced path addition with single point handling
  addPath(pathData, color, strokeWidth, inputType, isSinglePoint = false) {
    if (!pathData) return null;
    
    const newPath = {
      id: this.nextPathId,
      pathData,
      color,
      type: 'stroke',
      inputType,
      strokeWidth,
      isSinglePoint
    };
    
    const bbox = this.calculateBoundingBox(pathData);
    if (bbox) {
      this.pathBBoxes.set(this.nextPathId, bbox);
    }
    
    this.paths.push(newPath);
    this.nextPathId++;
    return newPath;
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

  clearPaths() {
    this.paths = [];
    this.pathBBoxes.clear();
    this.currentPath = [];
    this.pathsToErase.clear();
    this.nextPathId = 0;
    this.smoothingBuffer = [];
    this.lastVelocity = { x: 0, y: 0 };
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
    this.smoothingBuffer = [];
  }
}