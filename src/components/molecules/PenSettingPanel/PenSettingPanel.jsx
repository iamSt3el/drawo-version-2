// src/components/molecules/PenSettingPanel/PenSettingPanel.jsx
import React, { useState } from 'react'
import styles from './PenSettingPanel.module.scss'

const PenSettingPanel = ({ 
  onColorChange, 
  onStrokeWidthChange, 
  onOpacityChange,
  size, 
  color, 
  opacity = 100,
  setColor, 
  setSize,
  setOpacity 
}) => {
  const colors = [
    '#000000', // Black
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
    '#7c2d12', // Brown
  ];

  const [currentColor, setCurrentColor] = useState(color);
  const [currentSize, setCurrentSize] = useState(size);
  const [currentOpacity, setCurrentOpacity] = useState(opacity);

  const handleColorClick = (color) => {
    setCurrentColor(color);
    setColor(color);
    if (onColorChange) {
      onColorChange(color);
    }
  };

  const handleStrokeWidthChange = (width) => {
    onStrokeWidthChange(width);
    setSize(width);
    setCurrentSize(width);
  };

  const handleOpacityChange = (e) => {
    const newOpacity = parseInt(e.target.value);
    setCurrentOpacity(newOpacity);
    setOpacity(newOpacity);
    if (onOpacityChange) {
      onOpacityChange(newOpacity);
    }
  };

  // Create color with opacity for preview
  const getColorWithOpacity = (hexColor, opacity) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  return (
    <div className={styles.pensettingpanel}>
      <div className={styles.pensettingpanel_cover}>
        <div className={styles.section_header}>
          <h3>Pen Settings</h3>
        </div>

        {/* Color Section */}
        <div className={styles.section}>
          <div className={styles.section_title}>Color</div>
          <div className={styles.color_picker_cover}>
            <div className={styles.color_picker}>
              <div className={styles.color_grid}>
                {colors.map((color) => (
                  <div
                    key={color}
                    className={`${styles.color_option} ${currentColor === color ? styles.active : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorClick(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Opacity Section */}
        <div className={styles.section}>
          <div className={styles.section_title}>
            Opacity
            <span className={styles.value_display}>{currentOpacity}%</span>
          </div>
          <div className={styles.opacity_cover}>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={currentOpacity}
              onChange={handleOpacityChange}
              className={styles.opacity_slider} 
            />
            {/* Opacity preview */}
            <div className={styles.opacity_preview}>
              <div 
                className={styles.opacity_sample}
                style={{ 
                  backgroundColor: getColorWithOpacity(currentColor, currentOpacity)
                }}
              />
            </div>
          </div>
        </div>

        {/* Size Section */}
        <div className={styles.section}>
          <div className={styles.section_title}>
            Size
            <span className={styles.value_display}>{currentSize}px</span>
          </div>
          <div className={styles.size_cover}>
            <button 
              className={`${styles.size_button} ${currentSize === 2 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(2)}
            >
              <div className={styles.size_preview} style={{ width: '2px', height: '2px' }} />
              <span>S</span>
            </button>
            <button 
              className={`${styles.size_button} ${currentSize === 5 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(5)}
            >
              <div className={styles.size_preview} style={{ width: '5px', height: '5px' }} />
              <span>M</span>
            </button>
            <button 
              className={`${styles.size_button} ${currentSize === 8 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(8)}
            >
              <div className={styles.size_preview} style={{ width: '8px', height: '8px' }} />
              <span>L</span>
            </button>
            <button 
              className={`${styles.size_button} ${currentSize === 10 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(10)}
            >
              <div className={styles.size_preview} style={{ width: '10px', height: '10px' }} />
              <span>XL</span>
            </button>
          </div>
          
          {/* Custom size slider */}
          <div className={styles.custom_size}>
            <input
              type="range"
              min="1"
              max="20"
              value={currentSize}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
              className={styles.size_slider}
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className={styles.section}>
          <div className={styles.section_title}>Preview</div>
          <div className={styles.live_preview}>
            <svg width="160" height="60" viewBox="0 0 160 60">
              <path
                d="M 10 30 Q 50 10 80 30 Q 110 50 150 30"
                stroke={getColorWithOpacity(currentColor, currentOpacity)}
                strokeWidth={currentSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PenSettingPanel;