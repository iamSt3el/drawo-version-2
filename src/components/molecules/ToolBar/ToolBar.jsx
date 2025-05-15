// src/components/molecules/ToolBar/ToolBar.jsx
import React, { useState } from 'react'
import styles from './ToolBar.module.scss'
import { Button } from '../../atoms'
import { Eraser, MoveLeft, PaletteIcon, Pen, Undo, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ToolBar = ({ onToolChange, onClearCanvas, onUndo, setIsPen }) => {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState('pen');

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
          <Button Icon={MoveLeft} label={"back"} onClick={handleBackButtonClick} />
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