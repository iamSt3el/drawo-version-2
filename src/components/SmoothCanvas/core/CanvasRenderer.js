// src/components/SmoothCanvas/core/CanvasRenderer.js - Fixed path rendering
import React from 'react';
import rough from 'roughjs'

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.roughGenerator = rough.generator();
  }

  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();

    const renderedPaths = paths.map((pathObj) => {
      // Different rendering based on path type and sketchy mode
      if (pathObj.type === 'shape') {
        // Shape paths use Rough.js for rendering
        try {
          // Get original shape data if available
          const shape = pathObj.originalShape || {};
          
          // Configure rough options
          const roughOptions = {
            seed: parseInt(pathObj.id) || 42, // Consistent randomness
            stroke: pathObj.color,
            strokeWidth: pathObj.strokeWidth,
            roughness: pathObj.sketchyMode ? 1.5 : 0.5,
            bowing: pathObj.sketchyMode ? 1 : 0,
            fill: shape.fill ? shape.fillColor : undefined,
            fillStyle: 'solid',
            fillWeight: 0.5,
            opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
          };
          
          // Generate appropriate shape based on type
          let roughShape;
          
          switch (pathObj.shapeType) {
            case 'rectangle':
              roughShape = this.roughGenerator.rectangle(
                shape.x,
                shape.y,
                shape.width,
                shape.height,
                roughOptions
              );
              break;
              
            case 'circle':
              const centerX = shape.x + shape.width / 2;
              const centerY = shape.y + shape.height / 2;
              const diameter = Math.max(shape.width, shape.height);
              
              roughShape = this.roughGenerator.circle(
                centerX,
                centerY,
                diameter,
                roughOptions
              );
              break;
              
            case 'ellipse':
              const ellipseCenterX = shape.x + shape.width / 2;
              const ellipseCenterY = shape.y + shape.height / 2;
              
              roughShape = this.roughGenerator.ellipse(
                ellipseCenterX,
                ellipseCenterY,
                shape.width,
                shape.height,
                roughOptions
              );
              break;
              
            case 'line':
              roughShape = this.roughGenerator.line(
                shape.x1,
                shape.y1,
                shape.x2,
                shape.y2,
                roughOptions
              );
              break;
              
            case 'triangle':
              // For triangle, create polygon with 3 points
              const points = [
                [shape.x + shape.width / 2, shape.y], // Top
                [shape.x, shape.y + shape.height],    // Bottom left
                [shape.x + shape.width, shape.y + shape.height] // Bottom right
              ];
              
              roughShape = this.roughGenerator.polygon(points, roughOptions);
              break;
              
            default:
              // Fall back to path data if we can't determine the shape type
              roughShape = this.roughGenerator.path(pathObj.pathData, roughOptions);
              break;
          }
          
          // Render the shape as an SVG element
          return (
            <g 
              key={pathObj.id}
              style={{
                opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
                transition: 'opacity 0.1s ease',
                pointerEvents: 'none'
              }}
              dangerouslySetInnerHTML={{ 
                __html: roughShape ? roughShape.outerHTML : '' 
              }}
            />
          );
        } catch (error) {
          console.error('Error rendering shape:', error);
          
          // Fallback to normal path rendering
          return (
            <path
              key={pathObj.id}
              d={pathObj.pathData}
              fill="none"
              stroke={pathObj.color}
              strokeWidth={pathObj.strokeWidth}
              style={{
                opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
                transition: 'opacity 0.1s ease'
              }}
            />
          );
        }
      } else if (pathObj.sketchyMode) {
        // Sketchy paths use Rough.js
        try {
          const roughOptions = {
            stroke: pathObj.color,
            strokeWidth: pathObj.strokeWidth,
            fill: 'none',
            roughness: 1.5,
            bowing: 1,
            seed: parseInt(pathObj.id) || 42
          };
          
          const roughPath = this.roughGenerator.path(pathObj.pathData, roughOptions);
          
          return (
            <g 
              key={pathObj.id}
              style={{
                opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
                transition: 'opacity 0.1s ease'
              }}
              dangerouslySetInnerHTML={{ __html: roughPath.outerHTML }}
            />
          );
        } catch (error) {
          console.error('Error rendering rough path:', error);
          
          // Fallback to normal path
          return (
            <path
              key={pathObj.id}
              d={pathObj.pathData}
              fill={pathObj.color}
              stroke="none"
              fillRule="nonzero"
              style={{
                opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
                transition: 'opacity 0.1s ease'
              }}
            />
          );
        }
      } else {
        // Normal smooth path rendering
        return (
          <path
            key={pathObj.id}
            d={pathObj.pathData}
            fill={pathObj.color}
            stroke="none"
            fillRule="nonzero"
            style={{
              opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
              transition: 'opacity 0.1s ease'
            }}
          />
        );
      }
    });

    return renderedPaths;
  }
    // Add method to render temporary shapes during drawing
    renderTemporaryShape(temporaryShape) {
      if (!temporaryShape) return null;
      
      // Use Rough.js to render the preview
      try {
        const roughOptions = {
          seed: 42, // Consistent seed for previews
          stroke: temporaryShape.color,
          strokeWidth: temporaryShape.strokeWidth,
          roughness: temporaryShape.sketchyMode ? 1.5 : 0.5,
          bowing: temporaryShape.sketchyMode ? 1 : 0,
          fill: temporaryShape.fill ? temporaryShape.fillColor : undefined,
          fillStyle: 'solid',
          fillWeight: 0.5,
          opacity: temporaryShape.opacity / 100 || 0.8, // Slightly transparent for preview
        };
        
        let roughShape;
        
        switch (temporaryShape.type) {
          case 'rectangle':
            roughShape = this.roughGenerator.rectangle(
              temporaryShape.x,
              temporaryShape.y,
              temporaryShape.width,
              temporaryShape.height,
              roughOptions
            );
            break;
            
          case 'circle':
            const centerX = temporaryShape.x + temporaryShape.width / 2;
            const centerY = temporaryShape.y + temporaryShape.height / 2;
            const diameter = Math.max(temporaryShape.width, temporaryShape.height);
            
            roughShape = this.roughGenerator.circle(
              centerX,
              centerY,
              diameter,
              roughOptions
            );
            break;
            
          case 'ellipse':
            const ellipseCenterX = temporaryShape.x + temporaryShape.width / 2;
            const ellipseCenterY = temporaryShape.y + temporaryShape.height / 2;
            
            roughShape = this.roughGenerator.ellipse(
              ellipseCenterX,
              ellipseCenterY,
              temporaryShape.width,
              temporaryShape.height,
              roughOptions
            );
            break;
            
          case 'line':
            roughShape = this.roughGenerator.line(
              temporaryShape.x1,
              temporaryShape.y1,
              temporaryShape.x2,
              temporaryShape.y2,
              roughOptions
            );
            break;
            
          case 'triangle':
            const points = [
              [temporaryShape.x + temporaryShape.width / 2, temporaryShape.y], // Top
              [temporaryShape.x, temporaryShape.y + temporaryShape.height],    // Bottom left
              [temporaryShape.x + temporaryShape.width, temporaryShape.y + temporaryShape.height] // Bottom right
            ];
            
            roughShape = this.roughGenerator.polygon(points, roughOptions);
            break;
            
          default:
            return null;
        }
        
        return (
          <g 
            key="temp-shape"
            className="temporary-shape"
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              zIndex: 10,
            }}
            dangerouslySetInnerHTML={{ 
              __html: roughShape ? roughShape.outerHTML : '' 
            }}
          />
        );
      } catch (error) {
        console.error('Error rendering temporary shape:', error);
        return null;
      }
    }

  renderEraserCursor(showEraser, eraserPosition, eraserWidth) {
    if (!showEraser) return null;

    return (
      <div
        style={{
          width: eraserWidth * 2,
          height: eraserWidth * 2,
          left: eraserPosition.x - eraserWidth,
          top: eraserPosition.y - eraserWidth,
          position: 'absolute',
          border: '2px solid #ef4444',
          borderRadius: '50%',
          pointerEvents: 'none',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          zIndex: 100,
          transform: 'translateZ(0)',
          animation: 'none'
        }}
      />
    );
  }

  renderBackgroundImage(backgroundImageUrl, width, height) {
    if (!backgroundImageUrl) return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.1,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    );
  }

  renderGrid(width, height, gridSize = 20, gridColor = '#e5e7eb') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    );
  }
}