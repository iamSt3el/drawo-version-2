// src/components/SmoothCanvas/core/EventHandler.js - Fixed to prevent content disappearing with eraser
import { getStroke } from 'perfect-freehand';

export class EventHandler {
    constructor(canvasEngine, options = {}) {
      this.engine = canvasEngine;
      this.options = options;
      this.callbacks = {};
      
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

      this.engine.isDrawing = true;
      this.engine.activePointer = e.pointerId;
      e.preventDefault();

      if (this.engine.canvasRef.current.setPointerCapture) {
        this.engine.canvasRef.current.setPointerCapture(e.pointerId);
      }

      const point = this.engine.getPointFromEvent(e);
      this.engine.lastPoint = point;

      if (this.engine.isErasing) {
        this.engine.setPathsToErase(new Set());
        this.handleErase(point[0], point[1]);
      } else {
        this.engine.setCurrentPath([point]);
        this.createTempPath(point);
      }
    }

    handlePointerMove(e) {
      if (!this.engine.canvasRef.current) return;

      // Update eraser position
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

      if (!this.engine.isDrawing || e.pointerId !== this.engine.activePointer) return;

      e.preventDefault();

      if (this.engine.isErasing) {
        const point = this.engine.getPointFromEvent(e);
        this.handleErase(point[0], point[1]);
      } else {
        // Get coalesced events for smoother drawing
        let points = [];
        
        if (e.getCoalescedEvents && typeof e.getCoalescedEvents === 'function') {
          const coalescedEvents = e.getCoalescedEvents();
          for (const coalescedEvent of coalescedEvents) {
            points.push(this.engine.getPointFromEvent(coalescedEvent));
          }
        } else {
          points.push(this.engine.getPointFromEvent(e));
        }

        // Process all points
        for (const point of points) {
          this.updateDrawing(point);
        }
      }

      this.engine.lastPoint = this.engine.getPointFromEvent(e);
    }

    handlePointerUp(e) {
      if (!this.engine.isDrawing || e.pointerId !== this.engine.activePointer) return;

      this.engine.isDrawing = false;
      this.engine.activePointer = null;

      if (this.engine.canvasRef.current?.releasePointerCapture) {
        this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
      }

      if (this.engine.isErasing) {
        this.finalizeErase();
      } else {
        this.finalizeStroke(e);
      }

      this.engine.lastPoint = null;
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

    createTempPath(point) {
      const svg = this.engine.svgRef.current;
      const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tempPath.id = 'temp-path';
      tempPath.setAttribute('fill', this.options.strokeColor);
      tempPath.setAttribute('stroke', 'none');
      
      try {
        const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
        const stroke = getStroke([point], strokeOptions);
        const pathData = this.engine.getSvgPathFromStroke(stroke);
        tempPath.setAttribute('d', pathData);
      } catch (error) {
        const radius = this.options.strokeWidth / 2;
        const pathData = `M ${point[0] - radius},${point[1]} 
                         A ${radius},${radius} 0 1,1 ${point[0] + radius},${point[1]} 
                         A ${radius},${radius} 0 1,1 ${point[0] - radius},${point[1]} Z`;
        tempPath.setAttribute('d', pathData);
      }
      
      svg.appendChild(tempPath);
    }

    updateDrawing(point) {
      const newPath = [...this.engine.getCurrentPath(), point];
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

    handleErase(x, y) {
      const eraserRadius = this.options.eraserWidth / 2;
      const paths = this.engine.getPaths();
      const currentPathsToErase = new Set(this.engine.getPathsToErase());
      
      for (let i = 0; i < paths.length; i++) {
        const pathObj = paths[i];
        if (currentPathsToErase.has(pathObj.id)) continue;
        
        // Get the bounding box for this path/shape
        let bbox = this.engine.pathBBoxes.get(pathObj.id);
        if (!bbox) {
          // If this is a shape, we can create a bbox from its properties
          if (pathObj.type === 'shape') {
            if (pathObj.shapeType === 'line') {
              bbox = {
                x: Math.min(pathObj.x1, pathObj.x2),
                y: Math.min(pathObj.y1, pathObj.y2),
                width: Math.abs(pathObj.x2 - pathObj.x1),
                height: Math.abs(pathObj.y2 - pathObj.y1)
              };
            } else {
              bbox = {
                x: pathObj.x,
                y: pathObj.y,
                width: pathObj.width,
                height: pathObj.height
              };
            }
            this.engine.pathBBoxes.set(pathObj.id, bbox);
          } 
          // For stroee paths, calculate from path data
          else if (pathObj.type === 'stroke' && pathObj.pathData) {
            bbox = this.engine.calculateBoundingBox(pathObj.pathData);
            if (bbox) {
              this.engine.pathBBoxes.set(pathObj.id, bbox);
            }
          }
        }
        
        if (bbox && this.engine.eraserIntersectsBoundingBox(x, y, eraserRadius, bbox)) {
          currentPathsToErase.add(pathObj.id);
        }
      }
      
      // Update paths to erase only if something changed
      if (currentPathsToErase.size !== this.engine.getPathsToErase().size) {
        this.engine.setPathsToErase(currentPathsToErase);
        
        if (this.callbacks.onPathsMarkedForErase) {
          this.callbacks.onPathsMarkedForErase(currentPathsToErase);
        }
      }
    }

    finalizeErase() {
      const pathsToErase = this.engine.getPathsToErase();
      
      if (pathsToErase.size > 0) {
        // Filter out the erased paths from the paths array
        const newPaths = this.engine.getPaths().filter(path => !pathsToErase.has(path.id));
        
        // ONLY if we actually removed something - FIX for content disappearing
        if (newPaths.length < this.engine.getPaths().length) {
          this.engine.paths = newPaths;
          
          // Clean up bounding boxes
          pathsToErase.forEach(pathId => {
            this.engine.pathBBoxes.delete(pathId);
          });
          
          // Notify about paths being erased
          if (this.callbacks.onPathsErased) {
            this.callbacks.onPathsErased();
          }
        }
      }
      
      // Reset paths to erase
      this.engine.setPathsToErase(new Set());
    }

    finalizeStroke(e) {
      const currentPath = this.engine.getCurrentPath();
      if (currentPath.length === 0) return;

      try {
        const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
        const stroke = getStroke(currentPath, strokeOptions);
        const pathData = this.engine.getSvgPathFromStroke(stroke);

        // Remove temp path
        const svg = this.engine.svgRef.current;
        const tempPath = svg?.querySelector('#temp-path');
        if (tempPath) {
          tempPath.remove();
        }

        // Add to paths with the original input points for proper vector storage
        this.engine.addPath(
          pathData, 
          this.options.strokeColor, 
          this.options.strokeWidth, 
          this.engine.inputType,
          currentPath // Save the original input points
        );
        this.engine.setCurrentPath([]);

        if (this.callbacks.onStrokeComplete) {
          this.callbacks.onStrokeComplete();
        }
      } catch (error) {
        console.error('Error finalizing stroke:', error);
      }
    }

    attachListeners(element) {
      element.addEventListener('pointerdown', this.handlePointerDown);
      element.addEventListener('pointermove', this.handlePointerMove);
      element.addEventListener('pointerup', this.handlePointerUp);
      element.addEventListener('pointercancel', this.handlePointerUp);
      element.addEventListener('mouseenter', this.handleMouseEnter);
      element.addEventListener('mouseleave', this.handleMouseLeave);
    }

    detachListeners(element) {
      element.removeEventListener('pointerdown', this.handlePointerDown);
      element.removeEventListener('pointermove', this.handlePointerMove);
      element.removeEventListener('pointerup', this.handlePointerUp);
      element.removeEventListener('pointercancel', this.handlePointerUp);
      element.removeEventListener('mouseenter', this.handleMouseEnter);
      element.removeEventListener('mouseleave', this.handleMouseLeave);
    }
}