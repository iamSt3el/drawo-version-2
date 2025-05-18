// src/components/organisms/ShapePropertiesPanel/ShapePropertiesPanel.jsx
// A dedicated panel for shape properties that appears when a shape tool is selected

import React from 'react';
import styles from './ShapePropertiesPanel.module.scss';

const ShapePropertiesPanel = ({
  shapeProperties,
  onFillToggle,
  onFillColorChange,
  onFillOpacityChange,
  currentTool
}) => {
  const { fill, fillColor, fillOpacity } = shapeProperties;
  
  // List of colors for the fill color picker
  const fillColors = [
    '#000000', // Black
    '#ffffff', // White
    '#dc2626', // Red
    '#2563eb', // Blue
    '#16a34a', // Green
    '#ca8a04', // Yellow
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#6b7280', // Gray
    '#be185d', // Pink
    '#059669', // Emerald
  ];
  
  // Get shape type name for display
  const getShapeDisplayName = () => {
    switch (currentTool) {
      case 'rectangle':
        return 'Rectangle';
      case 'circle':
        return 'Circle';
      case 'ellipse':
        return 'Ellipse';
      case 'line':
        return 'Line';
      case 'triangle':
        return 'Triangle';
      case 'star':
        return 'Star';
      default:
        return 'Shape';
    }
  };
  
  // Check if the tool supports fill (lines don't)
  const supportsFill = currentTool !== 'line';
  
  return (
    <div className={styles.shapePropertiesPanel}>
      <div className={styles.sectionHeader}>
        <h3>{getShapeDisplayName()} Properties</h3>
      </div>
      
      {/* Fill toggle section - only for shapes that support fills */}
      {supportsFill && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Fill Shape
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={fill}
                onChange={(e) => onFillToggle(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          
          {/* Fill color section - only shown if fill is enabled */}
          {fill && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Fill Color</div>
                <div className={styles.colorGrid}>
                  {fillColors.map((color) => (
                    <div
                      key={color}
                      className={`${styles.colorOption} ${fillColor === color ? styles.active : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onFillColorChange(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  Fill Opacity
                  <span className={styles.valueDisplay}>{fillOpacity}%</span>
                </div>
                <div className={styles.opacityCover}>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={fillOpacity}
                    onChange={(e) => onFillOpacityChange(parseInt(e.target.value))}
                    className={styles.opacitySlider}
                  />
                  
                  {/* Preview of fill color with opacity */}
                  <div className={styles.opacityPreview}>
                    <div
                      className={styles.opacitySample}
                      style={{
                        backgroundColor: fillColor,
                        opacity: fillOpacity / 100
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Keyboard shortcuts help section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Keyboard Shortcuts</div>
        <div className={styles.shortcutsList}>
          <div className={styles.shortcutItem}>
            <span className={styles.shortcutKey}>Shift</span>
            <span className={styles.shortcutDesc}>
              {currentTool === 'line' 
                ? 'Draw straight horizontal/vertical lines' 
                : 'Draw perfect squares/circles'}
            </span>
          </div>
          <div className={styles.shortcutItem}>
            <span className={styles.shortcutKey}>Alt</span>
            <span className={styles.shortcutDesc}>Draw from center point</span>
          </div>
          <div className={styles.shortcutItem}>
            <span className={styles.shortcutKey}>Esc</span>
            <span className={styles.shortcutDesc}>Cancel current shape</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShapePropertiesPanel;