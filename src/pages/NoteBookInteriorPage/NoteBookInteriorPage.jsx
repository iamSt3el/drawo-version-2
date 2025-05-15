// src/pages/NoteBookInteriorPage/NoteBookInteriorPage.jsx - COMPLETE DEBUG VERSION
import React, { useState, useRef, useEffect } from 'react'
import styles from './NoteBookInteriorPage.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import { useNotebooks } from '../../context/NotebookContext'
import { NoteBookUi, ToolBar } from '../../components/molecules'
import PenSettingPanel from '../../components/molecules/PenSettingPanel/PenSettingPanel'
import PageSettingPanel from '../../components/molecules/PageSettingPanel/PageSettingPanel'

const NoteBookInteriorPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getNotebook } = useNotebooks();
    const notebookUiRef = useRef(null);

    // Canvas state
    const [currentTool, setCurrentTool] = useState('pen');
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [opacity, setOpacity] = useState(100);
    const [eraserWidth] = useState(10);
    const [isPen, setIsPen] = useState(true);
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(5);

    // Final stroke color that combines color and opacity
    const [finalStrokeColor, setFinalStrokeColor] = useState('#000000');

    // Panel visibility state
    const [isPanelVisible, setIsPanelVisible] = useState(true);
    
    // Page settings state
    const [pattern, setPattern] = useState('grid');
    const [patternSize, setPatternSize] = useState(20);
    const [patternColor, setPatternColor] = useState('#e5e7eb');
    const [patternOpacity, setPatternOpacity] = useState(50);

    const notebook = getNotebook(id);

    // Convert hex color to rgba with opacity
    const getColorWithOpacity = (hexColor, opacity) => {
        // Remove # if present
        const hex = hexColor.replace('#', '');
        
        // Handle 3-digit hex colors
        let r, g, b;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        
        return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    };

    // Update final stroke color when color or opacity changes
    useEffect(() => {
        if (opacity < 100) {
            const newColor = getColorWithOpacity(strokeColor, opacity);
            console.log('Updating finalStrokeColor:', newColor); // Debug log
            setFinalStrokeColor(newColor);
        } else {
            console.log('Using full opacity color:', strokeColor); // Debug log
            setFinalStrokeColor(strokeColor);
        }
    }, [strokeColor, opacity]);

    // Update color and size states when strokeColor or strokeWidth change
    useEffect(() => {
        setColor(strokeColor);
    }, [strokeColor]);

    useEffect(() => {
        setSize(strokeWidth);
    }, [strokeWidth]);

    const handleToolChange = (tool) => {
        setCurrentTool(tool);
        // Show pen panel only when pen is selected
        setIsPanelVisible(tool === 'pen');
    };

    const handleColorChange = (newColor) => {
        console.log('Color changed to:', newColor); // Debug log
        setStrokeColor(newColor);
        setColor(newColor); // Update the local color state as well
    };

    const handleStrokeWidthChange = (width) => {
        console.log('Stroke width changed to:', width); // Debug log
        setStrokeWidth(width);
        setSize(width); // Update the local size state as well
    };

    const handleOpacityChange = (newOpacity) => {
        console.log('Opacity changed to:', newOpacity); // Debug log
        setOpacity(newOpacity);
    };

    const handlePatternChange = (newPattern) => {
        setPattern(newPattern);
    };

    const handlePatternSizeChange = (newSize) => {
        setPatternSize(newSize);
    };

    const handlePatternColorChange = (newColor) => {
        setPatternColor(newColor);
    };

    const handlePatternOpacityChange = (newOpacity) => {
        setPatternOpacity(newOpacity);
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
        console.log('Canvas changed:', dataUrl);
    };

    console.log('Rendering with finalStrokeColor:', finalStrokeColor); // Debug log

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
                        strokeColor={finalStrokeColor}
                        strokeWidth={strokeWidth}
                        eraserWidth={eraserWidth}
                        pattern={pattern}
                        patternSize={patternSize}
                        patternColor={patternColor}
                        patternOpacity={patternOpacity}
                        onCanvasChange={handleCanvasChange}
                    />
                </div>
                
                {/* Enhanced panel with smooth transitions */}
                <div className={`${styles.notebook_interior_pen_setting_panel} ${
                    isPanelVisible && isPen ? styles.visible : styles.hidden
                }`}>
                    <PenSettingPanel
                        onColorChange={handleColorChange}
                        onStrokeWidthChange={handleStrokeWidthChange}
                        onOpacityChange={handleOpacityChange}
                        size={size}
                        color={color}
                        opacity={opacity}
                        setSize={setSize}
                        setColor={setColor}
                        setOpacity={setOpacity}
                    />
                    
                    {/* Panel toggle button */}
                    <button
                        className={styles.panel_toggle}
                        onClick={() => setIsPanelVisible(!isPanelVisible)}
                        title={isPanelVisible ? "Hide pen settings" : "Show pen settings"}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isPanelVisible ? styles.rotate : ''}
                        >
                            <path d="m9 18 6-6-6-6"/>
                        </svg>
                    </button>
                </div>

                {/* Page Settings Panel - Always available on the left */}
                <div className={`${styles.notebook_interior_page_setting_panel} ${
                    styles.visible
                }`}>
                    <PageSettingPanel
                        onPatternChange={handlePatternChange}
                        onPatternSizeChange={handlePatternSizeChange}
                        onPatternColorChange={handlePatternColorChange}
                        onPatternOpacityChange={handlePatternOpacityChange}
                        pattern={pattern}
                        patternSize={patternSize}
                        patternColor={patternColor}
                        patternOpacity={patternOpacity}
                        setPattern={setPattern}
                        setPatternSize={setPatternSize}
                        setPatternColor={setPatternColor}
                        setPatternOpacity={setPatternOpacity}
                    />
                </div>
            </div>
        </div>
    );
};

export default NoteBookInteriorPage;