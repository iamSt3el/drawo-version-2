// src/components/SmoothCanvas/core/CanvasEngine.js - Fixed ID generation and loading issues
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
    this.isLoading = false; // Add loading flag to prevent infinite loops
    
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
    
    // Keep canvas transparent for patterns
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  getStrokeOptions(inputType, strokeWidth) {
    const baseOptions = {
      size: strokeWidth,
      smoothing: 0.5,
      streamline: 0.5,
      last: true,
      start: { 
        taper: 0,
        cap: true 
      },
      end: { 
        taper: strokeWidth * 0,
        cap: true 
      }
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

  normalizeColor(color) {
    if (color.startsWith('rgba')) {
      return color;
    }
    if (color.startsWith('rgb')) {
      return color;
    }
    return color;
  }

  // Fixed ID generation to use timestamp + counter for uniqueness
  generatePathId() {
    return `path-${Date.now()}-${this.nextPathId++}`;
  }

  // Store stroke as VECTOR data with input points
  addPath(pathData, color, strokeWidth, inputType, inputPoints = []) {
    const newPath = {
      id: this.generatePathId(), // Use unique ID generation
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

  // Export as JSON containing VECTOR data, not images
  exportAsJSON() {
    return JSON.stringify({
      type: 'drawing',
      version: 1,
      elements: this.paths.map(path => ({
        id: path.id,
        type: path.type,
        pathData: path.pathData,
        color: path.color,
        strokeWidth: path.strokeWidth,
        inputType: path.inputType,
        inputPoints: path.inputPoints,
        timestamp: path.timestamp
      })),
      appState: {
        width: this.options.width,
        height: this.options.height
      }
    });
  }

  // Fixed import function to prevent infinite loops
  importFromJSON(jsonData) {
    if (this.isLoading) {
      console.log('Already loading, skipping...');
      return false;
    }

    this.isLoading = true;
    
    try {
      console.log('Importing vector data:', jsonData);
      
      let data;
      
      // Handle empty or invalid data
      if (!jsonData) {
        console.log('No drawing data to import');
        this.clearPaths();
        this.isLoading = false;
        return true;
      }
      
      // Parse JSON if it's a string
      if (typeof jsonData === 'string') {
        // Check if it's JSON or base64 image data
        if (jsonData.startsWith('data:image/')) {
          console.log('Legacy image data detected, ignoring');
          this.clearPaths();
          this.isLoading = false;
          return true;
        }
        
        if (!jsonData.trim().startsWith('{')) {
          console.log('Not JSON data, ignoring');
          this.clearPaths();
          this.isLoading = false;
          return true;
        }
        
        data = JSON.parse(jsonData);
      } else if (typeof jsonData === 'object') {
        data = jsonData;
      } else {
        console.log('Invalid data format');
        this.clearPaths();
        this.isLoading = false;
        return false;
      }

      // Validate data structure
      if (!data || !data.elements) {
        console.log('Invalid drawing data structure');
        this.clearPaths();
        this.isLoading = false;
        return true;
      }

      // If data is the same as current (no elements), don't reload
      if (data.elements.length === 0 && this.paths.length === 0) {
        console.log('No new data to load, skipping');
        this.isLoading = false;
        return true;
      }

      // Clear existing paths before importing
      this.clearPaths();

      // Import each path/element
      data.elements.forEach((element, index) => {
        if (element.type === 'stroke' && element.pathData) {
          // Reconstruct the path with a new unique ID to avoid conflicts
          const newPath = {
            id: this.generatePathId(),
            pathData: element.pathData,
            color: element.color || '#000000',
            type: element.type,
            inputType: element.inputType || 'mouse',
            strokeWidth: element.strokeWidth || 5,
            inputPoints: element.inputPoints || [],
            timestamp: element.timestamp || Date.now()
          };

          // Calculate bounding box
          const bbox = this.calculateBoundingBox(element.pathData);
          if (bbox) {
            this.pathBBoxes.set(newPath.id, bbox);
          }

          this.paths.push(newPath);
        }
      });

      // Update options if provided
      if (data.appState) {
        this.updateOptions({
          width: data.appState.width || this.options.width,
          height: data.appState.height || this.options.height
        });
      }

      console.log(`Successfully imported ${this.paths.length} paths`);
      this.isLoading = false;
      return true;
    } catch (error) {
      console.error('Error importing drawing data:', error);
      this.clearPaths();
      this.isLoading = false;
      return false;
    }
  }

  // Export as SVG for external use
  exportAsSVG() {
    const svg = this.svgRef.current;
    if (!svg) return '';

    // Clone SVG and ensure proper styling
    const svgClone = svg.cloneNode(true);
    
    // Set proper viewBox and dimensions
    svgClone.setAttribute('viewBox', `0 0 ${this.options.width} ${this.options.height}`);
    svgClone.setAttribute('width', this.options.width);
    svgClone.setAttribute('height', this.options.height);
    
    // Ensure paths have proper fills
    const paths = svgClone.querySelectorAll('path');
    paths.forEach((path, index) => {
      if (this.paths[index] && this.paths[index].color) {
        path.setAttribute('fill', this.paths[index].color);
        path.setAttribute('stroke', 'none');
      }
    });

    return new XMLSerializer().serializeToString(svgClone);
  }

  // Export as data URL (for backward compatibility if needed)
  exportAsDataUrl(format = 'png', transparent = true) {
    return new Promise(resolve => {
      // Create canvas to render SVG paths
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');

      exportCanvas.width = this.options.width * this.dpr;
      exportCanvas.height = this.options.height * this.dpr;
      exportCtx.scale(this.dpr, this.dpr);

      // Optionally add white background
      if (!transparent && format !== 'png') {
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, this.options.width, this.options.height);
      }

      // Render SVG to canvas
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