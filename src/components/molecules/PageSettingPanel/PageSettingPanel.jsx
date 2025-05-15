// src/components/molecules/PageSettingPanel/PageSettingPanel.jsx
import React, { useState, useEffect } from 'react'
import styles from './PageSettingPanel.module.scss'

const PageSettingPanel = ({ 
  onPatternChange,
  onPatternSizeChange,
  onPatternColorChange,
  onPatternOpacityChange,
  pattern = 'grid',
  patternSize = 20,
  patternColor = '#e5e7eb',
  patternOpacity = 50,
  setPattern,
  setPatternSize,
  setPatternColor,
  setPatternOpacity
}) => {
  const patterns = [
    { 
      id: 'blank', 
      label: 'Blank',
      icon: '□',
      description: 'Plain white background'
    },
    { 
      id: 'grid', 
      label: 'Grid',
      icon: '⊞',
      description: 'Square grid pattern'
    },
    { 
      id: 'dots', 
      label: 'Dots',
      icon: '⋯',
      description: 'Dotted grid pattern'
    },
    { 
      id: 'lines', 
      label: 'Lines',
      icon: '≡',
      description: 'Horizontal lines'
    },
    { 
      id: 'graph', 
      label: 'Graph',
      icon: '▦',
      description: 'Graph paper style'
    }
  ];

  const patternColors = [
    '#e5e7eb', // Light gray
    '#d1d5db', // Gray
    '#9ca3af', // Dark gray
    '#ddd6fe', // Light purple
    '#c7d2fe', // Light blue
    '#d1fae5', // Light green
    '#fef3c7', // Light yellow
    '#fed7d7', // Light red
  ];

  // Use props as initial state and update when props change
  const [currentPattern, setCurrentPattern] = useState(pattern);
  const [currentPatternSize, setCurrentPatternSize] = useState(patternSize);
  const [currentPatternColor, setCurrentPatternColor] = useState(patternColor);
  const [currentPatternOpacity, setCurrentPatternOpacity] = useState(patternOpacity);

  // Update state when props change (to keep in sync with parent)
  useEffect(() => {
    setCurrentPattern(pattern);
  }, [pattern]);

  useEffect(() => {
    setCurrentPatternSize(patternSize);
  }, [patternSize]);

  useEffect(() => {
    setCurrentPatternColor(patternColor);
  }, [patternColor]);

  useEffect(() => {
    setCurrentPatternOpacity(patternOpacity);
  }, [patternOpacity]);

  const handlePatternChange = (newPattern) => {
    setCurrentPattern(newPattern);
    if (setPattern) setPattern(newPattern);
    if (onPatternChange) onPatternChange(newPattern);
  };

  const handlePatternSizeChange = (newSize) => {
    setCurrentPatternSize(newSize);
    if (setPatternSize) setPatternSize(newSize);
    if (onPatternSizeChange) onPatternSizeChange(newSize);
  };

  const handlePatternColorChange = (newColor) => {
    setCurrentPatternColor(newColor);
    if (setPatternColor) setPatternColor(newColor);
    if (onPatternColorChange) onPatternColorChange(newColor);
  };

  const handlePatternOpacityChange = (e) => {
    const newOpacity = parseInt(e.target.value);
    setCurrentPatternOpacity(newOpacity);
    if (setPatternOpacity) setPatternOpacity(newOpacity);
    if (onPatternOpacityChange) onPatternOpacityChange(newOpacity);
  };

  return (
    <div className={styles.pagesettingpanel}>
      <div className={styles.pagesettingpanel_cover}>
        <div className={styles.section_header}>
          <h3>Page Settings</h3>
        </div>

        {/* Pattern Selection */}
        <div className={styles.section}>
          <div className={styles.section_title}>Pattern Type</div>
          <div className={styles.pattern_grid}>
            {patterns.map((patternOption) => (
              <div
                key={patternOption.id}
                className={`${styles.pattern_option} ${currentPattern === patternOption.id ? styles.active : ''}`}
                onClick={() => handlePatternChange(patternOption.id)}
                title={patternOption.description}
              >
                <div className={styles.pattern_icon}>{patternOption.icon}</div>
                <div className={styles.pattern_label}>{patternOption.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern Size */}
        {currentPattern !== 'blank' && (
          <div className={styles.section}>
            <div className={styles.section_title}>
              Pattern Size
              <span className={styles.value_display}>{currentPatternSize}px</span>
            </div>
            <div className={styles.size_cover}>
              <input
                type="range"
                min="10"
                max="50"
                value={currentPatternSize}
                onChange={(e) => handlePatternSizeChange(parseInt(e.target.value))}
                className={styles.size_slider}
              />
              <div className={styles.size_presets}>
                {[15, 20, 25, 30].map(size => (
                  <button
                    key={size}
                    className={`${styles.size_preset} ${currentPatternSize === size ? styles.active : ''}`}
                    onClick={() => handlePatternSizeChange(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pattern Color */}
        {currentPattern !== 'blank' && (
          <div className={styles.section}>
            <div className={styles.section_title}>Pattern Color</div>
            <div className={styles.color_picker_cover}>
              <div className={styles.color_picker}>
                <div className={styles.color_grid}>
                  {patternColors.map((color) => (
                    <div
                      key={color}
                      className={`${styles.color_option} ${currentPatternColor === color ? styles.active : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePatternColorChange(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pattern Opacity */}
        {currentPattern !== 'blank' && (
          <div className={styles.section}>
            <div className={styles.section_title}>
              Pattern Opacity
              <span className={styles.value_display}>{currentPatternOpacity}%</span>
            </div>
            <div className={styles.opacity_cover}>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={currentPatternOpacity}
                onChange={handlePatternOpacityChange}
                className={styles.opacity_slider} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageSettingPanel;