// src/components/molecules/ToolBar/ToolBar.jsx
// Enhanced with shape tool dropdown while preserving your menu structure

import React, { useState, useRef, useEffect } from 'react';
import styles from './ToolBar.module.scss';
import { Button } from '../../atoms';
import { 
  Grid3X3, 
  Eraser, 
  Settings, 
  Palette, 
  Menu, 
  X, 
  Pen, 
  Undo, 
  RotateCcw, 
  Square,
  Circle,
  Minus,
  Triangle,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ToolBar = ({
  onToolChange,
  onClearCanvas,
  onUndo,
  setIsPen,
  isMenuOpen,
  toggleMenu,
  togglePenPanel,
  setIsMenuOpen,
  togglePagePanel,
  handleExportImage,
  handleExportSVG
}) => {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState('pen');
  const [showShapeTools, setShowShapeTools] = useState(false);
  const shapeDropdownRef = useRef(null);
  
  // Define shape tools for easy reference
  const shapeTools = [
    { id: 'rectangle', label: 'Rectangle', Icon: Square },
    { id: 'circle', label: 'Circle', Icon: Circle },
    { id: 'line', label: 'Line', Icon: Minus },
    { id: 'triangle', label: 'Triangle', Icon: Triangle },
    { id: 'star', label: 'Star', Icon: Star }
  ];
  
  // Find current shape tool
  const currentShapeTool = shapeTools.find(tool => tool.id === activeTool);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showShapeTools && 
        shapeDropdownRef.current && 
        !shapeDropdownRef.current.contains(event.target)
      ) {
        setShowShapeTools(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShapeTools]);

  const handleBackButtonClick = () => {
    navigate('/');
  };

  const handleToolClick = (tool) => {
    setActiveTool(tool);
    
    if (tool === 'pen') {
      setIsPen(true);
    } else {
      setIsPen(false);
    }
    
    if (onToolChange) {
      onToolChange(tool);
    }
    
    // Close shape dropdown after selecting a shape
    if (shapeTools.some(shapeTool => shapeTool.id === tool)) {
      // Keep dropdown open for 300ms to give visual feedback
      setTimeout(() => {
        setShowShapeTools(false);
      }, 300);
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

  // Toggle shape tools dropdown
  const toggleShapeTools = (e) => {
    // Prevent event bubbling
    e.stopPropagation();
    setShowShapeTools(!showShapeTools);
  };
  
  // Get the appropriate shape icon based on current tool
  const getShapeButtonIcon = () => {
    // If a shape tool is active, show that shape's icon
    if (currentShapeTool) {
      return currentShapeTool.Icon;
    }
    
    // Default to Square if no shape tool is active
    return Square;
  };
  
  // Determine if the current tool is a shape tool
  const isShapeToolActive = Boolean(currentShapeTool);
  
  // Check if the specific dropdown tool is active
  const isSpecificShapeActive = (toolId) => activeTool === toolId;

  return (
    <div className={styles.toolbar_cover}>
      <div className={styles.toolbar_tools_cover}>
        {/* Quick Menu - Always visible */}
        <div className={`${styles.quick_menu} ${isMenuOpen ? styles.visible : ''}`}>
          <button
            className={styles.menu_toggle}
            onClick={toggleMenu}
            aria-label="Toggle quick menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          {isMenuOpen && (
            <div className={styles.menu_content}>
              <button
                className={styles.menu_item}
                onClick={() => { togglePenPanel(); setIsMenuOpen(false); }}
              >
                <Palette size={18} />
                <span>Pen Settings</span>
              </button>
              <button
                className={styles.menu_item}
                onClick={() => { togglePagePanel(); setIsMenuOpen(false); }}
              >
                <Grid3X3 size={18} />
                <span>Page Settings</span>
              </button>
              <div className={styles.menu_divider} />
              <button
                className={styles.menu_item}
                onClick={() => { handleExportImage(); setIsMenuOpen(false); }}
              >
                <Settings size={18} />
                <span>Export PNG</span>
              </button>
              <button
                className={styles.menu_item}
                onClick={() => { handleExportSVG(); setIsMenuOpen(false); }}
              >
                <Settings size={18} />
                <span>Export SVG</span>
              </button>
            </div>
          )}
        </div>

        <div className={styles.toolbar_tools}>
          {/* Drawing Tools */}
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

          {/* Shape Tools Section */}
          <div className={styles.toolbar_section} ref={shapeDropdownRef}>
            <Button
              Icon={getShapeButtonIcon()}
              label={"shapes"}
              isActive={isShapeToolActive}
              onClick={toggleShapeTools}
              hasDropdown={true}
              className={isShapeToolActive ? styles.shapeActive : ''}
            />
            
            {/* Shape tools dropdown */}
            {showShapeTools && (
              <>
                <div className={styles.overlay} onClick={() => setShowShapeTools(false)} />
                
                <div className={styles.tools_dropdown}>
                  {shapeTools.map((tool) => (
                    <Button
                      key={tool.id}
                      Icon={tool.Icon}
                      label={tool.label}
                      isActive={isSpecificShapeActive(tool.id)}
                      onClick={() => handleToolClick(tool.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

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