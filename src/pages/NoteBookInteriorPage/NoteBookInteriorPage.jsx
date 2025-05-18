// src/pages/NoteBookInteriorPage/NoteBookInteriorPage.jsx
// Updated to include both shape drawing utilities and menu functions

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './NoteBookInteriorPage.module.scss';
import { useParams } from 'react-router-dom';
import { NoteBookUi, ToolBar } from '../../components/molecules';
import PenSettingPanel from '../../components/molecules/PenSettingPanel/PenSettingPanel';
import PageSettingPanel from '../../components/molecules/PageSettingPanel/PageSettingPanel';
import ShapePropertiesPanel from '../../components/organisms/ShapePropertiesPanel';
import { useNotebookData } from '../../hooks/useNotebookData';
import { useCanvasAutoSave } from '../../hooks/useCanvasAutoSave';
import { useNotebooks } from '../../context/NotebookContextWithFS';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShapeDrawing, isShapeTool } from '../../utils/shapeDrawingUtils';

const NoteBookInteriorPage = () => {
  const { id } = useParams();
  const { savePage: savePageToContext } = useNotebooks();
  const notebookUiRef = useRef(null);
  const lastLoadedPageRef = useRef({ pageNumber: null, dataId: null });
  const settingsChangeTimeoutRef = useRef(null);

  // Use custom hook for notebook data management
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

  // Local state for current page settings
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
  const [sketchyMode, setSketchyMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Panel visibility state
  const [isPenPanelVisible, setIsPenPanelVisible] = useState(true);
  const [isPagePanelVisible, setIsPagePanelVisible] = useState(true);
  const [isShapePanelVisible, setIsShapePanelVisible] = useState(false);
  
  // Menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Handle shape completion - trigger save when a shape is completed
  const handleShapeComplete = useCallback((shapeData) => {
    console.log('Shape completed:', shapeData);
    // This will be handled by the canvas change handler
  }, []);

  // Use the shape drawing hook
  const {
    isDrawingShape,
    temporaryShape,
    shapeProperties,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleFillToggle,
    handleFillColorChange,
    handleFillOpacityChange,
    resetShapeDrawing,
    setShapeProperties
  } = useShapeDrawing({
    onShapeComplete: handleShapeComplete,
    canvasRef: notebookUiRef,
    strokeColor,
    strokeWidth,
    opacity,
    sketchyMode
  });

  // Enhanced auto-save
  const { debouncedSave, saveNow } = useCanvasAutoSave(async (vectorData) => {
    setIsSaving(true);
    try {
      console.log('Auto-save triggered for page:', currentPageNumber);
      
      // Save with current settings
      const pageDataToSave = {
        notebookId: notebook.id,
        pageNumber: currentPageNumber,
        canvasData: vectorData,
        settings: currentPageSettings
      };
      
      await savePageToContext(pageDataToSave);
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
    
    // Only process if this is actually new data
    if (lastLoadedPageRef.current.dataId !== dataId) {
      console.log('Processing new page data for page', currentPageNumber);
      
      // Load settings if available
      if (currentPageData.settings) {
        console.log('Loading page settings for page', currentPageNumber, ':', currentPageData.settings);
        setCurrentPageSettings({ ...currentPageData.settings });
        
        // Also load sketchy mode from settings if available
        if (currentPageData.settings.sketchyMode !== undefined) {
          setSketchyMode(currentPageData.settings.sketchyMode);
        }
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
        console.log(`Loading canvas data for page ${currentPageNumber}`);
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
      
      // Reset shape drawing state when changing pages
      resetShapeDrawing();
    } else {
      console.log('Same page data, skipping reload');
    }
  }, [currentPageData, currentPageNumber, resetShapeDrawing]);

  // Toggle shape panel visibility when selecting shape tools
  useEffect(() => {
    if (isShapeTool(currentTool)) {
      setIsShapePanelVisible(true);
    } else {
      setIsShapePanelVisible(false);
    }
    
    // Reset shape drawing when changing tools
    resetShapeDrawing();
  }, [currentTool, resetShapeDrawing]);

  // Handle tool change from toolbar
  const handleToolChange = (tool) => {
    setCurrentTool(tool);
    setIsPenPanelVisible(tool === 'pen');
    
    // Update isPen state
    const drawingTools = ['pen', 'pencil', 'brush', 'marker'];
    setIsPen(drawingTools.includes(tool));
  };

  // Handlers for pen settings
  const handleColorChange = (newColor) => {
    setStrokeColor(newColor);
  };

  const handleStrokeWidthChange = (width) => {
    setStrokeWidth(width);
  };

  const handleOpacityChange = (newOpacity) => {
    setOpacity(newOpacity);
  };

  const handleSketchyModeChange = (isSketchyMode) => {
    setSketchyMode(isSketchyMode);
    
    // Also update in page settings
    const updatedSettings = {
      ...currentPageSettings,
      sketchyMode: isSketchyMode
    };
    setCurrentPageSettings(updatedSettings);
    
    // Save the updated settings
    if (settingsChangeTimeoutRef.current) {
      clearTimeout(settingsChangeTimeoutRef.current);
    }
    
    settingsChangeTimeoutRef.current = setTimeout(() => {
      handlePageSettingChange('sketchyMode', isSketchyMode);
    }, 500);
  };

  // Canvas change handler
  const handleCanvasChange = useCallback((vectorData) => {
    console.log('Canvas change detected for page:', currentPageNumber);
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

  // Page settings handler
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
        console.log('Settings saved successfully');
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }, 500);
    
  }, [currentPageSettings, notebook, currentPageNumber, savePageToContext]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (settingsChangeTimeoutRef.current) {
        clearTimeout(settingsChangeTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced save before navigation
  const saveBeforeNavigation = useCallback(async () => {
    if (notebookUiRef.current && notebook) {
      try {
        const vectorData = notebookUiRef.current.exportJSON();
        
        // Use the direct save to context function with all data
        const pageDataToSave = {
          notebookId: notebook.id,
          pageNumber: currentPageNumber,
          canvasData: vectorData,
          settings: currentPageSettings
        };
        
        await savePageToContext(pageDataToSave);
        console.log('Page and settings saved before navigation');
      } catch (error) {
        console.error('Error saving before navigation:', error);
      }
    }
  }, [notebook, currentPageNumber, currentPageSettings, savePageToContext]);

  // Navigation handlers
  const handlePreviousPage = async () => {
    if (currentPageNumber > 1) {
      if (settingsChangeTimeoutRef.current) {
        clearTimeout(settingsChangeTimeoutRef.current);
        settingsChangeTimeoutRef.current = null;
      }
      
      await saveBeforeNavigation();
      await previousPage();
      resetShapeDrawing();
    }
  };

  const handleNextPage = async () => {
    if (settingsChangeTimeoutRef.current) {
      clearTimeout(settingsChangeTimeoutRef.current);
      settingsChangeTimeoutRef.current = null;
    }
    
    await saveBeforeNavigation();
    await nextPage();
    resetShapeDrawing();
  };

  // Manual save
  const handleManualSave = async () => {
    if (notebookUiRef.current && notebook) {
      setIsSaving(true);
      try {
        await saveBeforeNavigation();
        console.log('Manual save completed');
      } catch (error) {
        console.error('Error during manual save:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Canvas event handlers for shape drawing
  const handleCanvasMouseDownWrapper = (e) => {
    handleCanvasMouseDown(e, currentTool);
  };

  const handleCanvasMouseMoveWrapper = (e) => {
    handleCanvasMouseMove(e, currentTool);
  };

  const handleCanvasMouseUpWrapper = (e) => {
    handleCanvasMouseUp(e, currentTool);
  };
  
  // Menu toggle handler
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Panel toggle handlers
  const togglePenPanel = () => {
    setIsPenPanelVisible(!isPenPanelVisible);
  };
  
  const togglePagePanel = () => {
    setIsPagePanelVisible(!isPagePanelVisible);
  };
  
  // Export handlers
  const handleExportImage = async () => {
    if (notebookUiRef.current) {
      const imageData = await notebookUiRef.current.exportImage('png');
      const a = document.createElement('a');
      a.href = imageData;
      a.download = `${notebook?.title || 'notebook'}-page-${currentPageNumber}.png`;
      a.click();
    }
  };
  
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

  // Loading and error states
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
          currentTool={currentTool}
          onClearCanvas={handleClearCanvas}
          onUndo={handleUndo}
          setIsPen={setIsPen}
          handleNextPage={handleNextPage}
          handlePreviousPage={handlePreviousPage}
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          togglePenPanel={togglePenPanel}
          setIsMenuOpen={setIsMenuOpen}
          togglePagePanel={togglePagePanel}
          handleExportImage={handleExportImage}
          handleExportSVG={handleExportSVG}
        />

        {/* Save Status */}
        <div className={`${styles.save_status} ${isSaving ? styles.saving : ''}`}>
          {isSaving ? 'Saving...' : 'Auto-save enabled'}
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
        </div>

        {/* Main Canvas Area */}
        <div 
          className={styles.notebook_interior_canvas}
          onMouseDown={handleCanvasMouseDownWrapper}
          onMouseMove={handleCanvasMouseMoveWrapper}
          onMouseUp={handleCanvasMouseUpWrapper}
          onMouseLeave={handleCanvasMouseUpWrapper}
        >
          <NoteBookUi
            ref={notebookUiRef}
            currentTool={currentTool}
            strokeColor={finalStrokeColor}
            strokeWidth={strokeWidth}
            eraserWidth={eraserWidth}
            sketchyMode={sketchyMode}
            pattern={currentPageSettings.pattern}
            patternSize={currentPageSettings.patternSize}
            patternColor={currentPageSettings.patternColor}
            patternOpacity={currentPageSettings.patternOpacity}
            onCanvasChange={handleCanvasChange}
            key={currentPageNumber}
            initialCanvasData={currentPageData?.canvasData}
            temporaryShape={temporaryShape}
          />
        </div>

        {/* Pen Settings Panel (Right side) */}
        <div className={`${styles.notebook_interior_pen_setting_panel} ${isPenPanelVisible && isPen ? styles.visible : styles.hidden}`}>
          <PenSettingPanel
            onColorChange={handleColorChange}
            onStrokeWidthChange={handleStrokeWidthChange}
            onOpacityChange={handleOpacityChange}
            onSketchyModeChange={handleSketchyModeChange}
            size={strokeWidth}
            color={strokeColor}
            opacity={opacity}
            sketchyMode={sketchyMode}
            setColor={setStrokeColor}
            setSize={setStrokeWidth}
            setOpacity={setOpacity}
            setSketchyMode={setSketchyMode}
          />
        </div>
        
        {/* Shape Properties Panel (Right side) */}
        <div className={`${styles.notebook_interior_shape_panel} ${isShapePanelVisible ? styles.visible : styles.hidden}`}>
          <ShapePropertiesPanel
            shapeProperties={shapeProperties}
            onFillToggle={handleFillToggle}
            onFillColorChange={handleFillColorChange}
            onFillOpacityChange={handleFillOpacityChange}
            currentTool={currentTool}
          />
        </div>
      </div>

      {/* Floating Page Info with Navigation (bottom-right) */}
      <div className={styles.page_info_floating}>
        <span>Page {currentPageNumber} of {totalPages}</span>
        <div className={styles.nav_buttons}>
          <button
            className={styles.nav_button}
            onClick={handlePreviousPage}
            disabled={currentPageNumber <= 1}
            title="Previous Page (Ctrl + ←)"
          >
            <ChevronLeft />
          </button>
          <button
            className={styles.nav_button}
            onClick={handleNextPage}
            disabled={currentPageNumber >= totalPages}
            title="Next Page (Ctrl + →)"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteBookInteriorPage;