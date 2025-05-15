// src/components/SmoothCanvas/core/CanvasRenderer.js
import React from 'react';

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
  }

  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();

    return paths.map((pathObj) => (
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
    ));
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
          zIndex: 10,
          animation: 'eraserPulse 1s infinite ease-in-out'
        }}
      />
    );
  }

  

  
}