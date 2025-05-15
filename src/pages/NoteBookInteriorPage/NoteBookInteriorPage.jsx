// src/pages/NoteBookInteriorPage/NoteBookInteriorPage.jsx
import React, { useState, useRef } from 'react'
import styles from './NoteBookInteriorPage.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import { useNotebooks } from '../../context/NotebookContext'
import { NoteBookUi, ToolBar } from '../../components/molecules'
import PenSettingPanel from '../../components/molecules/PenSettingPanel/PenSettingPanel'

const NoteBookInteriorPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getNotebook } = useNotebooks();
    const notebookUiRef = useRef(null);

    // Canvas state
    const [currentTool, setCurrentTool] = useState('pen');
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [eraserWidth] = useState(10);
    const [isPen, setIsPen] = useState(true);
    const [color, setColor] = useState(strokeColor);
    const [size, setSize] = useState(strokeWidth);

    const notebook = getNotebook(id);

    const handleToolChange = (tool) => {
        setCurrentTool(tool);
    };

    const handleColorChange = (color) => {
        setStrokeColor(color);
    };

    const handleStrokeWidthChange = (width) => {
        setStrokeWidth(width);
    };

    const handleClearCanvas = () => {
        if (notebookUiRef.current) {
            notebookUiRef.current.clearCanvas();
        }
    };

    const handleUndo = () => {
        if (notebookUiRef.current) {
            notebookUiRef.current.undo();
        }
    };

    const handleCanvasChange = (dataUrl) => {
        // You can save the canvas data here if needed
        // For example, save to localStorage or send to a backend
        console.log('Canvas changed:', dataUrl);
    };

    return (
        <div className={styles.notebook_interior}>
            <div className={styles.notebook_interior_toolbar}>
                <ToolBar
                    onToolChange={handleToolChange}
                    onColorChange={handleColorChange}
                    onStrokeWidthChange={handleStrokeWidthChange}
                    onClearCanvas={handleClearCanvas}
                    onUndo={handleUndo}
                    setIsPen={setIsPen}
                />
            </div>
            <div className={styles.notebook_interior_ui}>
                <div className={styles.notebook_interior_canvas}>
                    <NoteBookUi
                        ref={notebookUiRef}
                        currentTool={currentTool}
                        strokeColor={strokeColor}
                        strokeWidth={strokeWidth}
                        eraserWidth={eraserWidth}
                        onCanvasChange={handleCanvasChange}
                    />
                </div>
                {/* Always keep this div in the DOM, but conditionally render its content */}
                <div className={styles.notebook_interior_pen_setting_panel}>
                    {isPen && (
                        <PenSettingPanel
                            onColorChange={handleColorChange}
                            onStrokeWidthChange={handleStrokeWidthChange}
                            size={size}
                            color={color}
                            setSize={setSize}
                            setColor={setColor}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default NoteBookInteriorPage;