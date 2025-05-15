// src/components/molecules/ToolBar/ToolBar.jsx
import React, { useState } from 'react'
import styles from './ToolBar.module.scss'
import { Button } from '../../atoms'
import { Eraser, MoveLeft, PaletteIcon, Pen, Undo, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ToolBar = ({ onToolChange, onColorChange, onStrokeWidthChange, onClearCanvas, onUndo }) => {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState('pen');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);

  const colors = [
    '#000000', // Black
    '#dc2626', // Red
    '#2563eb', // Blue
    '#16a34a', // Green
    '#ca8a04', // Yellow
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
  ];

  const handleBackButtonClick = () => {
    navigate('/');
  };

  const handleToolClick = (tool) => {
    setActiveTool(tool);
    if (onToolChange) {
      onToolChange(tool);
    }
  };

  const handleColorClick = (color) => {
    setCurrentColor(color);
    setShowColorPicker(false);
    if (onColorChange) {
      onColorChange(color);
    }
  };

  const handleStrokeWidthChange = (width) => {
    setStrokeWidth(width);
    if (onStrokeWidthChange) {
      onStrokeWidthChange(width);
    }
  };

  const handleClearCanvas = () => {
    if (onClearCanvas) {
      onClearCanvas();
    }
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
    }
  };

  return (
    <div className={styles.toolbar_cover}>
      <div className={styles.toolbar_tools_cover}>
        <div className={styles.toolbar_back_button}>
          <Button Icon={MoveLeft} label={"back"} onClick={handleBackButtonClick}/>
        </div>
        
        <div className={styles.toolbar_tools}>
          <Button 
            Icon={Pen} 
            label={"pen"} 
            isActive={activeTool === 'pen'}
            onClick={() => handleToolClick('pen')}
          />
          <Button 
            Icon={Eraser} 
            label={"eraser"}
            isActive={activeTool === 'eraser'}
            onClick={() => handleToolClick('eraser')}
          />
          
          {/* Color Picker */}
          <div className={styles.color_picker_container}>
            <Button 
              Icon={PaletteIcon}
              label={"colors"}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            {showColorPicker && (
              <div className={styles.color_picker}>
                <div className={styles.color_grid}>
                  {colors.map((color) => (
                    <div
                      key={color}
                      className={`${styles.color_option} ${currentColor === color ? styles.active : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorClick(color)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stroke Width Control */}
          {activeTool === 'pen' && (
            <div className={styles.stroke_width_container}>
              <label className={styles.stroke_width_label}>
                Width: {strokeWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
                className={styles.stroke_width_slider}
              />
            </div>
          )}

          {/* Action buttons */}
          <Button 
            Icon={Undo}
            label={"undo"}
            onClick={handleUndo}
          />
          <Button 
            Icon={RotateCcw}
            label={"clear"}
            onClick={handleClearCanvas}
          />
        </div>
      </div>
    </div>
  );
};

export default ToolBar;