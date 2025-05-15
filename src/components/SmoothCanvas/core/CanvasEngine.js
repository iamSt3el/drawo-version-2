// src/components/SmoothCanvas/core/OptimizedCanvasEngine.js
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
    this.activePointer = null;
    this.nextPathId = 0;
    this.pathsToErase = new Set();
    this.pathBBoxes = new Map();
    
    // Optimized smoothing properties
    this.pointBuffer = [];
    this.lastTimestamp = 0;
    this.velocitySmoothing = 0.2;
    this.lastVelocity = 0;
    
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
    
    // Optimize canvas for smooth drawing
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
  }

  // Optimized Perfect Freehand configuration
  getStrokeOptions(inputType, strokeWidth) {
    const baseOptions = {
      size: strokeWidth,
      smoothing: 0.8,      // Higher smoothing for better curves
      streamline: 0.7,     // Good balance between responsiveness and smoothness
      easing: (t) => {
        // Custom easing function for more natural pressure transitions
        return 1 - Math.pow(1 - t, 2.5);
      },
      start: { 
        taper: strokeWidth * 0.2,
        cap: true 
      },
      end: { 
        taper: strokeWidth * 1.8,
        cap: true 
      }
    };

    if (inputType === 'pen') {
      return {
        ...baseOptions,
        thinning: 0.7,           // Strong pressure sensitivity
        simulatePressure: false,  // Use real pressure
        smoothing: 0.85,         // Extra smooth for pen input
        streamline: 0.75,
        // Enhanced pressure handling
        last: true,
        start: { 
          taper: 0,
          cap: true 
        },
        end: { 
          taper: strokeWidth * 2.5,
          cap: true 
        }
      };
    } else {
      return {
        ...baseOptions,
        thinning: 0.5,          // Moderate pressure simulation
        simulatePressure: true, // Simulate pressure for mouse/touch
        smoothing: 0.75,
        streamline: 0.65,
        start: { 
          taper: strokeWidth * 0.3, 
          cap: true 
        },
        end: { 
          taper: strokeWidth * 1.5,
          cap: true 
        }
      };
    }
  }

  // Enhanced point processing with velocity-based smoothing
  getPointFromEvent(e) {
    const rect = this.canvasRef.current.getBoundingClientRect();
    const currentTime = performance.now();
    
    // Determine input type
    const type = e.pointerType || (e.touches ? 'touch' : 'mouse');
    if (type !== this.inputType) {
      this.inputType = type;
      this.pointBuffer = []; // Reset buffer when input type changes
    }

    // Get coordinates
    const x = (e.clientX - rect.left) / rect.width * this.options.width;
    const y = (e.clientY - rect.top) / rect.height * this.options.height;
    
    // Calculate velocity for better pressure simulation
    let velocity = 0;
    if (this.lastPoint && this.lastTimestamp) {
      const dx = x - this.lastPoint[0];
      const dy = y - this.lastPoint[1];
      const dt = currentTime - this.lastTimestamp;
      
      if (dt > 0) {
        const rawVelocity = Math.sqrt(dx * dx + dy * dy) / dt;
        // Smooth velocity using exponential moving average
        velocity = this.lastVelocity + this.velocitySmoothing * (rawVelocity - this.lastVelocity);
        this.lastVelocity = velocity;
      }
    }
    
    // Enhanced pressure calculation
    let pressure = 0.5;
    
    if (type === 'pen') {
      pressure = e.pressure || 0.5;
      // Enhance pressure sensitivity with velocity consideration
      pressure = Math.max(0.1, Math.min(1.0, pressure));
      
      // Reduce pressure for very fast movements (natural pen behavior)
      if (velocity > 0.8) {
        const velocityFactor = Math.max(0.3, 1 - (velocity - 0.8) / 2);
        pressure *= velocityFactor;
      }
    } else if (type === 'touch') {
      // Better touch pressure simulation
      const baseTrackerPressure = 0.6;
      const velocityBasedPressure = Math.max(0.2, 1 - velocity / 2);
      pressure = baseTrackerPressure * velocityBasedPressure;
      pressure = Math.max(0.2, Math.min(0.9, pressure));
    } else {
      // Mouse pressure simulation
      const basePressure = 0.7;
      const velocityBasedPressure = Math.max(0.4, 1 - velocity / 1.5);
      pressure = basePressure * velocityBasedPressure;
      pressure = Math.max(0.3, Math.min(1.0, pressure));
    }

    this.lastTimestamp = currentTime;
    return [x, y, pressure];
  }

  // Optimized SVG path generation
  getSvgPathFromStroke(stroke) {
    if (!stroke.length) return '';

    const d = [];
    const [first, ...rest] = stroke;
    
    // Start the path
    d.push('M', first[0].toFixed(1), first[1].toFixed(1));

    // Use quadratic Bézier curves for smoother paths
    for (let i = 0; i < rest.length; i++) {
      const point = rest[i];
      
      if (i === rest.length - 1) {
        // Last point - use line to
        d.push('L', point[0].toFixed(1), point[1].toFixed(1));
      } else {
        // Use quadratic curve for smoother interpolation
        const nextPoint = rest[i + 1];
        const cpX = (point[0] + nextPoint[0]) / 2;
        const cpY = (point[1] + nextPoint[1]) / 2;
        d.push('Q', point[0].toFixed(1), point[1].toFixed(1), cpX.toFixed(1), cpY.toFixed(1));
      }
    }

    d.push('Z');
    return d.join(' ');
  }

  // Improved point buffering for smoother strokes
  addToBuffer(point) {
    this.pointBuffer.push(point);
    
    // Keep buffer at optimal size
    if (this.pointBuffer.length > 4) {
      this.pointBuffer.shift();
    }
    
    // Return smoothed point
    if (this.pointBuffer.length === 1) {
      return point;
    }
    
    // Apply weighted smoothing
    let totalWeight = 0;
    let smoothX = 0, smoothY = 0, smoothPressure = 0;
    
    for (let i = 0; i < this.pointBuffer.length; i++) {
      const weight = (i + 1) / this.pointBuffer.length; // More weight to recent points
      const [x, y, pressure] = this.pointBuffer[i];
      
      smoothX += x * weight;
      smoothY += y * weight;
      smoothPressure += pressure * weight;
      totalWeight += weight;
    }
    
    return [
      smoothX / totalWeight,
      smoothY / totalWeight,
      smoothPressure / totalWeight
    ];
  }

  // Enhanced single point handling
  createSinglePointStroke(point, inputType, strokeWidth, color) {
    const [x, y, pressure] = point;
    const radius = (strokeWidth / 2) * Math.max(0.3, pressure);
    
    // Create a smooth circle for single points with slight natural variation
    const segments = 16;
    const angleStep = (Math.PI * 2) / segments;
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
      const angle = i * angleStep;
      // Add slight natural variation
      const variation = 1 + (Math.random() - 0.5) * 0.05;
      const pointRadius = radius * variation;
      
      points.push([
        x + Math.cos(angle) * pointRadius,
        y + Math.sin(angle) * pointRadius,
        pressure
      ]);
    }
    
    const stroke = getStroke(points, {
      size: strokeWidth * 0.8,
      thinning: 0,
      smoothing: 0.9,
      simulatePressure: false
    });
    
    return this.getSvgPathFromStroke(stroke);
  }

  // Rest of your existing methods...
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

  // ... (keep your existing calculateBoundingBox, clearPaths, undo, etc.)
  
  // Missing methods from your original implementation
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
    this.pointBuffer = [];
    this.lastVelocity = 0;
  }

  undo() {
    if (this.paths.length === 0) return false;
    
    const lastPath = this.paths.pop();
    if (lastPath && lastPath.id !== undefined) {
      this.pathBBoxes.delete(lastPath.id);
    }
    return true;
  }

  // Getters that your component expects
  getPaths() {
    return this.paths;
  }

  getPathsToErase() {
    return this.pathsToErase;
  }

  getCurrentPath() {
    return this.currentPath;
  }

  // Setters that your component expects
  setPathsToErase(pathsToErase) {
    this.pathsToErase = pathsToErase;
  }

  setCurrentPath(path) {
    this.currentPath = path;
  }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // Update canvas dimensions if they changed
    if (newOptions.width !== undefined || newOptions.height !== undefined) {
      this.initializeCanvas();
    }
  }

  // Clean up
  destroy() {
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.pathBBoxes.clear();
    this.pointBuffer = [];
    this.currentPath = [];
    this.paths = [];
    this.pathsToErase.clear();
  }

  // Enhanced export with better quality
  async exportAsDataUrl(format = 'png') {
    const svg = this.svgRef.current;
    if (!svg) return Promise.resolve('');

    // Create high-quality canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Use 2x resolution for crisp export
    const scale = 2;
    canvas.width = this.options.width * scale;
    canvas.height = this.options.height * scale;
    ctx.scale(scale, scale);

    // Setup high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.options.width, this.options.height);

    // Convert SVG to image with higher quality
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise(resolve => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, this.options.width, this.options.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL(`image/${format}`, 0.95));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.src = url;
    });
  }
}