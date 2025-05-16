// pages/NoteBookInteriorPage/NoteBookInteriorPage.jsx - Fixed to properly handle page data loading
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
    const { savePage: savePageToContext } = useNotebooks();
    const notebookUiRef = useRef(null);
    const lastLoadedPageRef = useRef({ pageNumber: null, dataId: null });
    const settingsChangeTimeoutRef = useRef(null);

    // Use custom hook for notebook data management - pass canvas ref
    const {
        notebook,
        pages,
        currentPageNumber,
        currentPageData,
        loading,
        error,
        saveCurrentPage,
        navigateToPage,
        nextPage,
        previousPage,
        totalPages,
        getCurrentCanvasData
    } = useNotebookData(id, notebookUiRef);

    // Local state for current page settings - each page manages its own settings
    const [currentPageSettings, setCurrentPageSettings] = useState({
        pattern: 'grid',
        patternSize: 20,
        patternColor: '#e5e7eb',
        patternOpacity: 50
    });

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

    // Enhanced auto-save that properly handles both canvas and settings
    const { debouncedSave, saveNow } = useCanvasAutoSave(async (vectorData) => {
        setIsSaving(true);
        try {
            console.log('Auto-save triggered for page:', currentPageNumber);
            console.log('Current settings during auto-save:', currentPageSettings);
            
            // Save with current settings
            const pageDataToSave = {
                notebookId: notebook.id,
                pageNumber: currentPageNumber,
                canvasData: vectorData,
                settings: currentPageSettings
            };
            
            await savePageToContext(pageDataToSave);
            console.log('Auto-save completed with settings:', currentPageSettings);
        } catch (error) {
            console.error('Error during auto-save:', error);
        } finally {
            setIsSaving(false);
        }
    }, 1500);

    // Final stroke color that combines color and opacity
    const finalStrokeColor = opacity < 100
        ? `rgba(${parseInt(strokeColor.slice(1, 3), 16)}, ${parseInt(strokeColor.slice(3, 5), 16)}, ${parseInt(strokeColor.slice(5, 7), 16)}, ${opacity / 100})`
        : strokeColor;

    // Enhanced page data change detection
    useEffect(() => {
        if (!currentPageData) {
            console.log('No current page data');
            return;
        }

        // Create a unique identifier for this page data
        const dataId = `${currentPageData.id}_${currentPageData.lastModified || Date.now()}_${JSON.stringify(currentPageData.settings)}`;
        
        console.log('Page data changed:', {
            pageNumber: currentPageNumber,
            dataId: dataId,
            lastDataId: lastLoadedPageRef.current.dataId,
            settings: currentPageData.settings,
            canvasDataLength: currentPageData.canvasData?.length || 0
        });

        // Only process if this is actually new data
        if (lastLoadedPageRef.current.dataId !== dataId) {
            console.log('Processing new page data for page', currentPageNumber);
            
            // Load settings if available
            if (currentPageData.settings) {
                console.log('Loading page settings for page', currentPageNumber, ':', currentPageData.settings);
                setCurrentPageSettings({ ...currentPageData.settings });
            } else {
                console.log('No settings found for page', currentPageNumber, ', using defaults');
                setCurrentPageSettings({
                    pattern: 'grid',
                    patternSize: 20,
                    patternColor: '#e5e7eb',
                    patternOpacity: 50
                });
            }

            // Load canvas data
            if (notebookUiRef.current && currentPageData.canvasData) {
                console.log(`Loading canvas data for page ${currentPageNumber}:`, currentPageData.canvasData.length, 'characters');
                // Add a small delay to ensure React state has updated
                setTimeout(() => {
                    notebookUiRef.current.loadCanvasData(currentPageData.canvasData);
                }, 50);
            } else if (notebookUiRef.current) {
                // Clear canvas for new pages
                console.log(`Clearing canvas for new page ${currentPageNumber}`);
                notebookUiRef.current.clearCanvas();
            }

            // Update the ref to track this data
            lastLoadedPageRef.current = {
                pageNumber: currentPageNumber,
                dataId: dataId
            };
        } else {
            console.log('Same page data, skipping reload');
        }
    }, [currentPageData, currentPageNumber]);

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

    // Canvas change handler - trigger debounced save with current settings
    const handleCanvasChange = useCallback((vectorData) => {
        console.log('Canvas change detected for page:', currentPageNumber);
        // Don't trigger auto-save immediately if we just changed page
        debouncedSave(vectorData);
    }, [debouncedSave, currentPageNumber]);

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

    // Page settings handler - updates local state and triggers debounced save
    const handlePageSettingChange = useCallback((settingName, value) => {
        console.log(`Changing ${settingName} to ${value}`);
        const newSettings = { ...currentPageSettings, [settingName]: value };
        
        // Update local page settings immediately for UI responsiveness
        setCurrentPageSettings(newSettings);
        
        // Clear any existing timeout
        if (settingsChangeTimeoutRef.current) {
            clearTimeout(settingsChangeTimeoutRef.current);
        }
        
        // Set a debounced save for settings changes
        settingsChangeTimeoutRef.current = setTimeout(async () => {
            try {
                console.log('Saving settings change:', newSettings);
                const vectorData = notebookUiRef.current ? notebookUiRef.current.exportJSON() : null;
                
                const pageDataToSave = {
                    notebookId: notebook.id,
                    pageNumber: currentPageNumber,
                    canvasData: vectorData,
                    settings: newSettings
                };
                
                await savePageToContext(pageDataToSave);
                console.log('Settings saved successfully:', newSettings);
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        }, 500); // 500ms debounce for settings changes
        
    }, [currentPageSettings, notebook, currentPageNumber, savePageToContext]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (settingsChangeTimeoutRef.current) {
                clearTimeout(settingsChangeTimeoutRef.current);
            }
        };
    }, []);

    // Enhanced save before navigation to include settings
    const saveBeforeNavigation = useCallback(async () => {
        if (notebookUiRef.current && notebook) {
            try {
                const vectorData = notebookUiRef.current.exportJSON();
                
                console.log('Current page settings before navigation:', currentPageSettings);
                
                // Use the direct save to context function with all data
                const pageDataToSave = {
                    notebookId: notebook.id,
                    pageNumber: currentPageNumber,
                    canvasData: vectorData,
                    settings: currentPageSettings
                };
                
                console.log('Complete page data being saved before navigation:', pageDataToSave);
                await savePageToContext(pageDataToSave);
                console.log('Page and settings saved before navigation');
            } catch (error) {
                console.error('Error saving before navigation:', error);
            }
        }
    }, [notebook, currentPageNumber, currentPageSettings, savePageToContext]);

    // Update navigation handlers to use the enhanced save function
    const handlePreviousPage = async () => {
        if (currentPageNumber > 1) {
            // Clear any pending settings save timeouts
            if (settingsChangeTimeoutRef.current) {
                clearTimeout(settingsChangeTimeoutRef.current);
                settingsChangeTimeoutRef.current = null;
            }
            
            await saveBeforeNavigation();
            await previousPage();
        }
    };

    const handleNextPage = async () => {
        // Clear any pending settings save timeouts
        if (settingsChangeTimeoutRef.current) {
            clearTimeout(settingsChangeTimeoutRef.current);
            settingsChangeTimeoutRef.current = null;
        }
        
        await saveBeforeNavigation();
        await nextPage();
    };

    // Update manual save to include settings
    const handleManualSave = async () => {
        if (notebookUiRef.current && notebook) {
            setIsSaving(true);
            try {
                await saveBeforeNavigation(); // This includes both canvas and settings
                console.log('Manual save completed');
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
            a.download = `${notebook?.title || 'notebook'}-page-${currentPageNumber}.svg`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleExportImage = async () => {
        if (notebookUiRef.current) {
            const imageData = await notebookUiRef.current.exportImage('png');
            const a = document.createElement('a');
            a.href = imageData;
            a.download = `${notebook?.title || 'notebook'}-page-${currentPageNumber}.png`;
            a.click();
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = async (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        await handlePreviousPage();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        await handleNextPage();
                        break;
                    case 's':
                        e.preventDefault();
                        await handleManualSave();
                        break;
                    case 'e':
                        e.preventDefault();
                        await handleExportSVG();
                        break;
                    case 'i':
                        e.preventDefault();
                        await handleExportImage();
                        break;
                    default:
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentPageNumber, notebook, handlePreviousPage, handleNextPage, handleManualSave]);

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
                    handleNextPage={handleNextPage}
                    handlePreviousPage={handlePreviousPage}
                />

                {/* Page Info in Toolbar */}
                <div className={styles.page_info}>
                    <span>Page {currentPageNumber} of {totalPages}</span>
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
                        pattern={currentPageSettings.pattern}
                        patternSize={currentPageSettings.patternSize}
                        patternColor={currentPageSettings.patternColor}
                        patternOpacity={currentPageSettings.patternOpacity}
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
                        title="Previous page (Ctrl+←)"
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
                        pattern={currentPageSettings.pattern}
                        patternSize={currentPageSettings.patternSize}
                        patternColor={currentPageSettings.patternColor}
                        patternOpacity={currentPageSettings.patternOpacity}
                        onCanvasChange={handleCanvasChange}
                        key={currentPageNumber} // Simple key based on page number
                        initialCanvasData={currentPageData?.canvasData}
                    />
                </div>

                {/* Right page navigation */}
                <div className={`${styles.page_navigation} ${styles.right}`}>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPageNumber >= totalPages || isSaving}
                        className={styles.nav_button}
                        title="Next page (Ctrl+→)"
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