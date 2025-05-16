// pages/NoteBookInteriorPage/NoteBookInteriorPage.jsx - Simple Excalidraw-style saving
import React, { useState, useRef, useEffect, useCallback } from 'react'
import styles from './NoteBookInteriorPage.module.scss'
import { useParams } from 'react-router-dom'
import { NoteBookUi, ToolBar } from '../../components/molecules'
import PenSettingPanel from '../../components/molecules/PenSettingPanel/PenSettingPanel'
import PageSettingPanel from '../../components/molecules/PageSettingPanel/PageSettingPanel'
import { useNotebookData } from '../../hooks/useNotebookData'
import { useCanvasAutoSave } from '../../hooks/useCanvasAutoSave'
import { useNotebooks } from '../../context/NotebookContextWithFS'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const NoteBookInteriorPage = () => {
    const { id } = useParams();
    const { pageSettings, updatePageSettings } = useNotebooks();
    const notebookUiRef = useRef(null);

    // Use custom hook for notebook data management
    const {
        notebook,
        pages,  // Add this line - it was missing
        currentPageNumber,
        currentPageData,
        loading,
        error,
        saveCurrentPage,
        navigateToPage,
        nextPage,
        previousPage
    } = useNotebookData(id);

    // Canvas state
    const [currentTool, setCurrentTool] = useState('pen');
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [opacity, setOpacity] = useState(100);
    const [eraserWidth] = useState(10);
    const [isPen, setIsPen] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Panel visibility state
    const [isPenPanelVisible, setIsPenPanelVisible] = useState(true);
    const [isPagePanelVisible, setIsPagePanelVisible] = useState(true);

    // Simple auto-save - like Excalidraw (debounced)
    const { debouncedSave, saveNow } = useCanvasAutoSave(async (vectorData) => {
        setIsSaving(true);
        try {
            await saveCurrentPage(vectorData);
        } catch (error) {
            console.error('Error saving page:', error);
        } finally {
            setIsSaving(false);
        }
    }, 1500); // Save after 1.5 seconds of inactivity

    // Final stroke color that combines color and opacity
    const finalStrokeColor = opacity < 100
        ? `rgba(${parseInt(strokeColor.slice(1, 3), 16)}, ${parseInt(strokeColor.slice(3, 5), 16)}, ${parseInt(strokeColor.slice(5, 7), 16)}, ${opacity / 100})`
        : strokeColor;

    // Update page settings when they change
    useEffect(() => {
        if (currentPageData && currentPageData.settings) {
            updatePageSettings(currentPageData.settings);
        }
    }, [currentPageData?.settings, updatePageSettings]);

    const handleToolChange = (tool) => {
        setCurrentTool(tool);
        setIsPenPanelVisible(tool === 'pen');
    };

    const handleColorChange = (newColor) => {
        setStrokeColor(newColor);
    };

    const handleStrokeWidthChange = (width) => {
        setStrokeWidth(width);
    };

    const handleOpacityChange = (newOpacity) => {
        setOpacity(newOpacity);
    };

    // Simple canvas change handler - trigger debounced save on every change
    const handleCanvasChange = useCallback((vectorData) => {
        debouncedSave(vectorData);
    }, [debouncedSave]);

    const handleClearCanvas = async () => {
        if (notebookUiRef.current) {
            notebookUiRef.current.clearCanvas();
            // Clear will trigger onCanvasChange automatically
        }
    };

    const handleUndo = async () => {
        if (notebookUiRef.current) {
            notebookUiRef.current.undo();
            // Undo will trigger onCanvasChange automatically
        }
    };

    const handlePageSettingChange = useCallback((settingName, value) => {
        const newSettings = { ...pageSettings, [settingName]: value };
        updatePageSettings(newSettings);
    }, [pageSettings, updatePageSettings]);

    // Simple navigation handlers
    const handlePreviousPage = async () => {
        if (currentPageNumber > 1) {
            // Save current page before navigating
            if (notebookUiRef.current) {
                const vectorData = notebookUiRef.current.exportJSON();
                await saveNow(vectorData);
            }
            await navigateToPage(currentPageNumber - 1);
        }
    };

    const handleNextPage = async () => {
        console.log(notebook.pages)
        if (notebook && currentPageNumber < notebook.pages) {
            // Save current page before navigating
            if (notebookUiRef.current) {
                const vectorData = notebookUiRef.current.exportJSON();
                await saveNow(vectorData);
            }
            await navigateToPage(currentPageNumber + 1);
        }

        if (notebookUiRef.current) {
            const vectorData = notebookUiRef.current.exportJSON();
            await saveNow(vectorData);
        }
        await navigateToPage(currentPageNumber + 1);

    };

    // Manual save function
    const handleManualSave = async () => {
        if (notebookUiRef.current) {
            setIsSaving(true);
            try {
                const vectorData = notebookUiRef.current.exportJSON();
                await saveNow(vectorData);
            } catch (error) {
                console.error('Error during manual save:', error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    // Export functions
    const handleExportSVG = async () => {
        if (notebookUiRef.current) {
            const svgData = notebookUiRef.current.exportSVG();
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `page-${currentPageNumber}.svg`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleExportImage = async () => {
        if (notebookUiRef.current) {
            const imageData = await notebookUiRef.current.exportImage('png');
            const a = document.createElement('a');
            a.href = imageData;
            a.download = `page-${currentPageNumber}.png`;
            a.click();
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        handlePreviousPage();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        handleNextPage();
                        break;
                    case 's':
                        e.preventDefault();
                        handleManualSave();
                        break;
                    case 'e':
                        e.preventDefault();
                        handleExportSVG();
                        break;
                    case 'i':
                        e.preventDefault();
                        handleExportImage();
                        break;
                    default:
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentPageNumber, notebook]);

    if (loading) {
        return (
            <div className={styles.loading_container}>
                <div className={styles.loading_spinner}>Loading notebook...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error_container}>
                <div className={styles.error_message}>Error: {error}</div>
            </div>
        );
    }

    if (!notebook) {
        return (
            <div className={styles.error_container}>
                <div className={styles.error_message}>Notebook not found</div>
            </div>
        );
    }

    return (
        <div className={styles.notebook_interior}>
            <div className={styles.notebook_interior_toolbar}>
                <ToolBar
                    onToolChange={handleToolChange}
                    onClearCanvas={handleClearCanvas}
                    onUndo={handleUndo}
                    setIsPen={setIsPen}
                />

                {/* Page Info in Toolbar */}
                <div className={styles.page_info}>
                    <span>Page {currentPageNumber} of {notebook.pages}</span>
                </div>

                {/* Save Status */}
                <div className={`${styles.save_status} ${isSaving ? styles.saving : ''}`}>
                    {isSaving ? 'Saving...' : 'Auto-save enabled'}
                </div>

                {/* Export buttons */}
                <div className={styles.export_buttons}>
                    <button onClick={handleExportSVG} title="Export as SVG (Ctrl+E)">SVG</button>
                    <button onClick={handleExportImage} title="Export as PNG (Ctrl+I)">PNG</button>
                    <button onClick={handleManualSave} title="Manual Save (Ctrl+S)">Save</button>
                </div>
            </div>

            <div className={styles.notebook_interior_ui}>
                {/* Page Settings Panel (Left side) */}
                <div className={`${styles.notebook_interior_page_setting_panel} ${isPagePanelVisible ? styles.visible : styles.hidden}`}>
                    <PageSettingPanel
                        onPatternChange={(pattern) => handlePageSettingChange('pattern', pattern)}
                        onPatternSizeChange={(size) => handlePageSettingChange('patternSize', size)}
                        onPatternColorChange={(color) => handlePageSettingChange('patternColor', color)}
                        onPatternOpacityChange={(opacity) => handlePageSettingChange('patternOpacity', opacity)}
                        pattern={pageSettings.pattern}
                        patternSize={pageSettings.patternSize}
                        patternColor={pageSettings.patternColor}
                        patternOpacity={pageSettings.patternOpacity}
                        setPattern={(pattern) => handlePageSettingChange('pattern', pattern)}
                        setPatternSize={(size) => handlePageSettingChange('patternSize', size)}
                        setPatternColor={(color) => handlePageSettingChange('patternColor', color)}
                        setPatternOpacity={(opacity) => handlePageSettingChange('patternOpacity', opacity)}
                    />

                    <button
                        className={styles.panel_toggle}
                        onClick={() => setIsPagePanelVisible(!isPagePanelVisible)}
                        title={isPagePanelVisible ? "Hide page settings" : "Show page settings"}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isPagePanelVisible ? '' : styles.rotate}>
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                </div>

                {/* Left page navigation */}
                <div className={`${styles.page_navigation} ${styles.left}`}>
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPageNumber <= 1 || isSaving}
                        className={styles.nav_button}
                        title="Previous page"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>

                <div className={styles.notebook_interior_canvas}>
                    <NoteBookUi
                        ref={notebookUiRef}
                        currentTool={currentTool}
                        strokeColor={finalStrokeColor}
                        strokeWidth={strokeWidth}
                        eraserWidth={eraserWidth}
                        pattern={pageSettings.pattern}
                        patternSize={pageSettings.patternSize}
                        patternColor={pageSettings.patternColor}
                        patternOpacity={pageSettings.patternOpacity}
                        onCanvasChange={handleCanvasChange}
                        initialCanvasData={currentPageData?.canvasData}
                    />
                </div>

                {/* Right page navigation */}
                <div className={`${styles.page_navigation} ${styles.right}`}>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPageNumber >= notebook.pages || isSaving}
                        className={styles.nav_button}
                        title="Next page"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Pen Settings Panel (Right side) */}
                <div className={`${styles.notebook_interior_pen_setting_panel} ${isPenPanelVisible && isPen ? styles.visible : styles.hidden}`}>
                    <PenSettingPanel
                        onColorChange={handleColorChange}
                        onStrokeWidthChange={handleStrokeWidthChange}
                        onOpacityChange={handleOpacityChange}
                        size={strokeWidth}
                        color={strokeColor}
                        opacity={opacity}
                        setSize={setStrokeWidth}
                        setColor={setStrokeColor}
                        setOpacity={setOpacity}
                    />

                    <button
                        className={styles.panel_toggle}
                        onClick={() => setIsPenPanelVisible(!isPenPanelVisible)}
                        title={isPenPanelVisible ? "Hide pen settings" : "Show pen settings"}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isPenPanelVisible ? styles.rotate : ''}>
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteBookInteriorPage;