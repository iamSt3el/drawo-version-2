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
    const baseOptions = {
      size: strokeWidth,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => t,
      start: { 
        taper: strokeWidth * 0.5,
        cap: true 
      },
      end: { 
        taper: strokeWidth * 2,
        cap: true 
      }
    };

    if (inputType === 'pen') {
      return {
        ...baseOptions,
        thinning: 0.3,
        simulatePressure: false,
        smoothing: 0.9,
        streamline: 0.6,
        start: { 
          taper: strokeWidth * 0.3,
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
        thinning: 0.4,
        simulatePressure: true,
        smoothing: 0.6,
        streamline: 0.5,
        start: { 
          taper: strokeWidth * 0.5, 
          cap: true 
        },
        end: { 
          taper: strokeWidth * 2,
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
      pressure = Math.max(0.2, Math.min(0.9, pressure));
    } else if (type === 'touch') {
      pressure = 0.6;
    } else {
      pressure = 0.8;
    }

    return [x, y, pressure];
  }

  createSmoothEnding(points) {
    if (points.length < 2) return points;
    
    const lastPoint = points[points.length - 1];
    const smoothPoints = [...points];
    const taperSteps = Math.min(3, this.options.strokeWidth / 2);
    
    for (let i = 1; i <= taperSteps; i++) {
      const t = i / (taperSteps + 1);
      const pressure = lastPoint[2] * (1 - t * 0.8);
      const x = lastPoint[0];
      const y = lastPoint[1];
      smoothPoints.push([x, y, Math.max(0.1, pressure)]);
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