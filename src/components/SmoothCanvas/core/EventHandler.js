// src/components/SmoothCanvas/core/OptimizedEventHandler.js
import { getStroke } from 'perfect-freehand';

export class EventHandler {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.callbacks = {};
    
    // Optimized event handling
    this.isDrawing = false;
    this.pointerStartTime = 0;
    this.pointerMovedSignificantly = false;
    this.singlePointThreshold = 3; // pixels
    this.singlePointDelay = 100; // ms
    this.singlePointTimer = null;
    this.startPoint = null;
    
    // Throttling for performance
    this.lastUpdateTime = 0;
    this.updateThrottle = 16; // ~60fps
    this.pendingUpdate = null;
    
    // Bind methods
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  handlePointerDown(e) {
    if (!this.engine.canvasRef.current || !e.isPrimary) return;

    // Prevent default behaviors
    e.preventDefault();
    e.stopPropagation();

    this.isDrawing = true;
    this.engine.activePointer = e.pointerId;
    this.pointerStartTime = performance.now();
    this.pointerMovedSignificantly = false;

    // Capture pointer for better tracking
    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    const point = this.engine.getPointFromEvent(e);
    this.startPoint = point;
    this.engine.lastPoint = point;

    if (this.engine.isErasing) {
      this.engine.setPathsToErase(new Set());
      this.handleErase(point[0], point[1]);
    } else {
      // Clear previous buffer and start new stroke
      this.engine.pointBuffer = [];
      this.engine.setCurrentPath([point]);
      this.createOptimizedTempPath([point]);
      
      // Set single point timer
      this.singlePointTimer = setTimeout(() => {
        if (!this.pointerMovedSignificantly && this.isDrawing) {
          this.handleSinglePoint(this.startPoint);
        }
      }, this.singlePointDelay);
    }
  }

  handlePointerMove(e) {
    if (!this.engine.canvasRef.current) return;

    // Always update eraser position
    if (this.options.currentTool === 'eraser') {
      const rect = this.engine.canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.engine.eraserPosition = { x, y };
      this.engine.showEraser = true;
      
      if (this.callbacks.onEraserMove) {
        this.callbacks.onEraserMove({ x, y });
      }
    }

    if (!this.isDrawing || e.pointerId !== this.engine.activePointer) return;

    e.preventDefault();
    e.stopPropagation();

    const point = this.engine.getPointFromEvent(e);

    // Check for significant movement
    if (!this.pointerMovedSignificantly && this.startPoint) {
      const dx = point[0] - this.startPoint[0];
      const dy = point[1] - this.startPoint[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > this.singlePointThreshold) {
        this.pointerMovedSignificantly = true;
        if (this.singlePointTimer) {
          clearTimeout(this.singlePointTimer);
          this.singlePointTimer = null;
        }
      }
    }

    if (this.engine.isErasing) {
      this.handleErase(point[0], point[1]);
    } else {
      // Throttle updates for better performance
      const currentTime = performance.now();
      if (currentTime - this.lastUpdateTime < this.updateThrottle) {
        if (this.pendingUpdate) {
          cancelAnimationFrame(this.pendingUpdate);
        }
        this.pendingUpdate = requestAnimationFrame(() => {
          this.updateDrawing(point);
          this.lastUpdateTime = currentTime;
          this.pendingUpdate = null;
        });
      } else {
        this.updateDrawing(point);
        this.lastUpdateTime = currentTime;
      }
    }

    this.engine.lastPoint = point;
  }

  handlePointerUp(e) {
    if (!this.isDrawing || e.pointerId !== this.engine.activePointer) return;

    e.preventDefault();
    e.stopPropagation();

    this.isDrawing = false;
    this.engine.activePointer = null;
    this.pointerMovedSignificantly = false;

    // Clear single point timer
    if (this.singlePointTimer) {
      clearTimeout(this.singlePointTimer);
      this.singlePointTimer = null;
    }

    // Release pointer capture
    if (this.engine.canvasRef.current?.releasePointerCapture) {
      this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
    }

    if (this.engine.isErasing) {
      this.finalizeErase();
    } else {
      this.finalizeStroke(e);
    }

    this.engine.lastPoint = null;
    this.startPoint = null;
  }

  handleMouseEnter() {
    if (this.options.currentTool === 'eraser') {
      this.engine.showEraser = true;
      if (this.callbacks.onEraserShow) {
        this.callbacks.onEraserShow(true);
      }
    }
  }

  handleMouseLeave() {
    this.engine.showEraser = false;
    if (this.callbacks.onEraserShow) {
      this.callbacks.onEraserShow(false);
    }
  }

  createOptimizedTempPath(points) {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    // Remove existing temp path
    const existingTempPath = svg.querySelector('#temp-path');
    if (existingTempPath) {
      existingTempPath.remove();
    }

    // Create new temp path
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.id = 'temp-path';
    tempPath.setAttribute('fill', this.options.strokeColor);
    tempPath.setAttribute('stroke', 'none');
    tempPath.setAttribute('fill-rule', 'nonzero');
    
    // Optimize for real-time updates
    tempPath.style.willChange = 'd';
    tempPath.style.contain = 'layout style paint';

    try {
      const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
      const stroke = getStroke(points, strokeOptions);
      const pathData = this.engine.getSvgPathFromStroke(stroke);
      tempPath.setAttribute('d', pathData);
    } catch (error) {
      // Fallback for single points
      const [x, y] = points[0];
      const radius = this.options.strokeWidth / 2;
      const pathData = `M ${x - radius},${y} 
                       A ${radius},${radius} 0 1,1 ${x + radius},${y} 
                       A ${radius},${radius} 0 1,1 ${x - radius},${y} Z`;
      tempPath.setAttribute('d', pathData);
    }
    
    svg.appendChild(tempPath);
  }

  updateDrawing(point) {
    // Add point to buffer and get smoothed point
    const smoothedPoint = this.engine.addToBuffer(point);
    const currentPath = this.engine.getCurrentPath();
    const newPath = [...currentPath, smoothedPoint];
    this.engine.setCurrentPath(newPath);

    const svg = this.engine.svgRef.current;
    const tempPath = svg?.querySelector('#temp-path');

    if (tempPath && newPath.length > 1) {
      try {
        const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
        const stroke = getStroke(newPath, strokeOptions);
        const pathData = this.engine.getSvgPathFromStroke(stroke);
        tempPath.setAttribute('d', pathData);
      } catch (error) {
        console.warn('Error updating path:', error);
      }
    }
  }

  handleSinglePoint(point) {
    if (!this.pointerMovedSignificantly && this.isDrawing) {
      const svg = this.engine.svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      
      if (tempPath) {
        const pathData = this.engine.createSinglePointStroke(
          point, 
          this.engine.inputType, 
          this.options.strokeWidth, 
          this.options.strokeColor
        );
        tempPath.setAttribute('d', pathData);
      }
    }
  }

  handleErase(x, y) {
    const eraserRadius = this.options.eraserWidth / 2;
    const paths = this.engine.getPaths();
    const currentPathsToErase = new Set(this.engine.getPathsToErase());
    
    for (let i = 0; i < paths.length; i++) {
      const pathObj = paths[i];
      if (currentPathsToErase.has(pathObj.id)) continue;
      
      if (pathObj.type === 'stroke' && pathObj.pathData) {
        let bbox = this.engine.pathBBoxes.get(pathObj.id);
        if (!bbox) {
          bbox = this.engine.calculateBoundingBox(pathObj.pathData);
          if (bbox) {
            this.engine.pathBBoxes.set(pathObj.id, bbox);
          }
        }
        
        if (bbox && this.engine.eraserIntersectsBoundingBox(x, y, eraserRadius, bbox)) {
          currentPathsToErase.add(pathObj.id);
        }
      }
    }
    
    this.engine.setPathsToErase(currentPathsToErase);
    
    if (this.callbacks.onPathsMarkedForErase) {
      this.callbacks.onPathsMarkedForErase(currentPathsToErase);
    }
  }

  finalizeErase() {
    const pathsToErase = this.engine.getPathsToErase();
    
    if (pathsToErase.size > 0) {
      const newPaths = this.engine.getPaths().filter(path => !pathsToErase.has(path.id));
      this.engine.paths = newPaths;
      
      pathsToErase.forEach(pathId => {
        this.engine.pathBBoxes.delete(pathId);
      });
      
      if (this.callbacks.onPathsErased) {
        this.callbacks.onPathsErased();
      }
    }
    
    this.engine.setPathsToErase(new Set());
  }

  finalizeStroke(e) {
    const currentPath = this.engine.getCurrentPath();
    if (currentPath.length === 0) return;

    try {
      let finalPath = currentPath;
      
      // Add final point if moved significantly
      if (this.pointerMovedSignificantly) {
        const finalPoint = this.engine.getPointFromEvent(e);
        finalPath = [...currentPath, finalPoint];
      }

      const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
      
      // Handle single point differently
      let pathData;
      if (finalPath.length === 1 || !this.pointerMovedSignificantly) {
        pathData = this.engine.createSinglePointStroke(
          finalPath[0], 
          this.engine.inputType, 
          this.options.strokeWidth, 
          this.options.strokeColor
        );
      } else {
        const stroke = getStroke(finalPath, strokeOptions);
        pathData = this.engine.getSvgPathFromStroke(stroke);
      }

      // Remove temp path
      const svg = this.engine.svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) {
        tempPath.remove();
      }

      // Add to paths
      this.engine.addPath(
        pathData, 
        this.options.strokeColor, 
        this.options.strokeWidth, 
        this.engine.inputType,
        finalPath.length === 1 || !this.pointerMovedSignificantly
      );
      this.engine.setCurrentPath([]);

      if (this.callbacks.onStrokeComplete) {
        this.callbacks.onStrokeComplete();
      }
    } catch (error) {
      console.error('Error finalizing stroke:', error);
    }
  }

  // Optimized event listener management
  attachListeners(element) {
    // Use passive listeners where appropriate
    const options = { passive: false };
    const passiveOptions = { passive: true };
    
    element.addEventListener('pointerdown', this.handlePointerDown, options);
    element.addEventListener('pointermove', this.handlePointerMove, options);
    element.addEventListener('pointerup', this.handlePointerUp, options);
    element.addEventListener('pointercancel', this.handlePointerUp, options);
    element.addEventListener('mouseenter', this.handleMouseEnter, passiveOptions);
    element.addEventListener('mouseleave', this.handleMouseLeave, passiveOptions);
    
    // Disable context menu for better drawing experience
    element.addEventListener('contextmenu', (e) => e.preventDefault(), options);
  }

  detachListeners(element) {
    element.removeEventListener('pointerdown', this.handlePointerDown);
    element.removeEventListener('pointermove', this.handlePointerMove);
    element.removeEventListener('pointerup', this.handlePointerUp);
    element.removeEventListener('pointercancel', this.handlePointerUp);
    element.removeEventListener('mouseenter', this.handleMouseEnter);
    element.removeEventListener('mouseleave', this.handleMouseLeave);
    element.removeEventListener('contextmenu', (e) => e.preventDefault());
    
    // Clear any pending updates
    if (this.pendingUpdate) {
      cancelAnimationFrame(this.pendingUpdate);
      this.pendingUpdate = null;
    }
    
    if (this.singlePointTimer) {
      clearTimeout(this.singlePointTimer);
      this.singlePointTimer = null;
    }
  }
}