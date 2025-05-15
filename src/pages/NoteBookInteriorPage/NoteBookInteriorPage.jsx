// pages/NoteBookInteriorPage/NoteBookInteriorPageWithFS.jsx - Updated with filesystem integration
import React, { useState, useRef, useEffect } from 'react'
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

    // Panel visibility state
    const [isPenPanelVisible, setIsPenPanelVisible] = useState(true);
    const [isPagePanelVisible, setIsPagePanelVisible] = useState(true);

    // Auto-save hook for canvas changes
    const { debouncedSave, saveNow } = useCanvasAutoSave(saveCurrentPage, 3000);

    // Final stroke color that combines color and opacity
    const finalStrokeColor = opacity < 100
        ? `rgba(${parseInt(strokeColor.slice(1, 3), 16)}, ${parseInt(strokeColor.slice(3, 5), 16)}, ${parseInt(strokeColor.slice(5, 7), 16)}, ${opacity / 100})`
        : strokeColor;

    // Load canvas data when current page changes
    useEffect(() => {
        if (currentPageData && currentPageData.canvasData && notebookUiRef.current) {
            // Load saved canvas data
            const img = new Image();
            img.onload = () => {
                // Clear canvas first
                notebookUiRef.current.clearCanvas();
                // Then load the saved image
                const canvas = notebookUiRef.current.canvasRef?.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
            };
            img.src = currentPageData.canvasData;
        }
    }, [currentPageData, currentPageNumber]);

    // Update page settings when they change
    useEffect(() => {
        if (currentPageData && currentPageData.settings) {
            updatePageSettings(currentPageData.settings);
        }
    }, [currentPageData, updatePageSettings]);

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

    const handleCanvasChange = async (dataUrl) => {
        // Auto-save canvas changes with the data URL
        debouncedSave(dataUrl);
    };

    const handleClearCanvas = () => {
        if (notebookUiRef.current) {
            notebookUiRef.current.clearCanvas();
            // Save immediately after clearing with empty canvas
            setTimeout(() => {
                const canvas = notebookUiRef.current.canvasRef?.current;
                if (canvas) {
                    // Create white background data URL for cleared canvas
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.fillStyle = '#ffffff';
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                    const dataUrl = tempCanvas.toDataURL('image/png');
                    saveNow(dataUrl);
                }
            }, 100);
        }
    };

    const handleUndo = () => {
        if (notebookUiRef.current) {
            notebookUiRef.current.undo();
            // Save after undo
            setTimeout(() => {
                notebookUiRef.current.exportImage().then(dataUrl => {
                    debouncedSave(dataUrl);
                });
            }, 100);
        }
    };

    const handlePageSettingChange = (settingName, value) => {
        const newSettings = { ...pageSettings, [settingName]: value };
        updatePageSettings(newSettings);
    };

    // Fixed navigation handlers
    const handlePreviousPage = async () => {
        if (currentPageNumber > 1) {
            // Save current page before navigating
            if (notebookUiRef.current) {
                const dataUrl = await notebookUiRef.current.exportImage();
                await saveNow(dataUrl);
            }
            // Navigate to previous page
            await navigateToPage(currentPageNumber - 1);
        }
    };

    const handleNextPage = async () => {
        if (notebook && currentPageNumber < notebook.pages) {
            // Save current page before navigating
            if (notebookUiRef.current) {
                const dataUrl = await notebookUiRef.current.exportImage();
                await saveNow(dataUrl);
            }
            // Navigate to next page
            await navigateToPage(currentPageNumber + 1);
        }
    };

    // Keyboard shortcuts for page navigation
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
                        // Manual save
                        if (notebookUiRef.current) {
                            notebookUiRef.current.exportImage().then(dataUrl => {
                                saveNow(dataUrl);
                            });
                        }
                        break;
                    default:
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentPageNumber, notebook, saveNow]);

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
                <div className={styles.save_status}>
                    Auto-save enabled
                </div>
            </div>

            <div className={styles.notebook_interior_ui}>
                {/* Page Settings Panel (Left side) */}
                <div className={`${styles.notebook_interior_page_setting_panel} ${isPagePanelVisible ? styles.visible : styles.hidden
                    }`}>
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
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isPagePanelVisible ? '' : styles.rotate}
                        >
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                </div>

                {/* Left page navigation */}
                <div className={`${styles.page_navigation} ${styles.left}`}>
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPageNumber <= 1}
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
                    />
                </div>

                {/* Right page navigation */}
                <div className={`${styles.page_navigation} ${styles.right}`}>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPageNumber >= notebook.pages}
                        className={styles.nav_button}
                        title="Next page"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Pen Settings Panel (Right side) */}
                <div className={`${styles.notebook_interior_pen_setting_panel} ${isPenPanelVisible && isPen ? styles.visible : styles.hidden
                    }`}>
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
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isPenPanelVisible ? styles.rotate : ''}
                        >
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteBookInteriorPage;