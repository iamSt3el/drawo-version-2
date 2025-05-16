// hooks/useNotebookData.js - Remove global pageSettings dependencies
import { useState, useEffect, useCallback } from 'react';
import { useNotebooks } from '../context/NotebookContextWithFS';

export const useNotebookData = (notebookId, canvasRef = null) => {
  const {
    loadNotebook,
    updateNotebook,
    savePage,
    loadPage,
    loadPagesByNotebook
  } = useNotebooks(); // Remove pageSettings and updatePageSettings

  const [notebook, setNotebook] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [currentPageData, setCurrentPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to get current canvas data
  const getCurrentCanvasData = useCallback(() => {
    if (canvasRef?.current && canvasRef.current.exportJSON) {
      return canvasRef.current.exportJSON();
    }
    return null;
  }, [canvasRef]);

  // Load notebook and its pages
  useEffect(() => {
    if (notebookId) {
      loadNotebookData();
    }
  }, [notebookId]);

  const loadNotebookData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load notebook
      const notebookData = await loadNotebook(notebookId);
      setNotebook(notebookData);

      // Load all pages for this notebook
      const pagesData = await loadPagesByNotebook(notebookId);
      setPages(pagesData);

      // If no pages exist, create the first page automatically
      if (pagesData.length === 0) {
        console.log('No pages found, creating first page...');
        
        const firstPageData = {
          notebookId: notebookId,
          pageNumber: 1,
          canvasData: JSON.stringify({
            type: 'drawing',
            version: 1,
            elements: [],
            appState: {
              width: 870,
              height: 870
            }
          }),
          settings: {
            pattern: 'grid',
            patternSize: 20,
            patternColor: '#e5e7eb',
            patternOpacity: 50
          }
        };

        try {
          const savedPage = await savePage(firstPageData);
          setPages([savedPage]);
          setCurrentPageData(savedPage);
          
          // Update notebook with the page reference
          if (!notebookData.pages || !notebookData.pages.includes(savedPage.id)) {
            const updatedNotebook = await updateNotebook(notebookId, {
              pages: [...(notebookData.pages || []), savedPage.id],
              currentPage: 1
            });
            setNotebook(updatedNotebook);
          }
        } catch (pageError) {
          console.error('Error creating first page:', pageError);
          // Create empty page data even if save fails
          const emptyPageData = {
            id: `${notebookId}_page_1`,
            notebookId: notebookId,
            pageNumber: 1,
            canvasData: JSON.stringify({
              type: 'drawing',
              version: 1,
              elements: [],
              appState: {
                width: 870,
                height: 870
              }
            }),
            settings: {
              pattern: 'grid',
              patternSize: 20,
              patternColor: '#e5e7eb',
              patternOpacity: 50
            }
          };
          setCurrentPageData(emptyPageData);
        }
      } else {
        // Load current page if it exists
        const currentPage = pagesData.find(p => p.pageNumber === currentPageNumber) || pagesData[0];
        setCurrentPageData(currentPage);
        if (currentPage.pageNumber) {
          setCurrentPageNumber(currentPage.pageNumber);
        }
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save current page with canvas data (simplified - no longer needs settings from context)
  const saveCurrentPage = useCallback(async (canvasData) => {
    if (!notebook) return;

    try {
      console.log('Saving page data:', { 
        pageNumber: currentPageNumber, 
        hasData: !!canvasData,
        dataType: typeof canvasData,
        dataLength: canvasData ? JSON.stringify(canvasData).length : 0
      });

      // If no canvas data provided, try to get it from the canvas ref
      let finalCanvasData = canvasData;
      if (!finalCanvasData && getCurrentCanvasData) {
        finalCanvasData = getCurrentCanvasData();
      }

      // Don't pass settings here - they'll be passed from the component
      const pageData = {
        notebookId: notebook.id,
        pageNumber: currentPageNumber,
        canvasData: typeof finalCanvasData === 'string' ? finalCanvasData : JSON.stringify(finalCanvasData)
      };

      const savedPage = await savePage(pageData);
      setCurrentPageData(savedPage);

      // Update pages array
      setPages(prev => {
        const index = prev.findIndex(p => p.pageNumber === currentPageNumber);
        if (index >= 0) {
          const newPages = [...prev];
          newPages[index] = savedPage;
          return newPages;
        } else {
          return [...prev, savedPage].sort((a, b) => a.pageNumber - b.pageNumber);
        }
      });

      // Update notebook with page reference if needed
      const pageId = savedPage.id;
      if (notebook.pages && !notebook.pages.includes(pageId)) {
        const updatedNotebook = await updateNotebook(notebook.id, {
          pages: [...(notebook.pages || []), pageId],
          currentPage: currentPageNumber,
          progress: Math.round((currentPageNumber / getTotalPages()) * 100)
        });
        setNotebook(updatedNotebook);
      } else {
        // Just update progress and current page
        const updatedNotebook = await updateNotebook(notebook.id, {
          currentPage: currentPageNumber,
          progress: Math.round((currentPageNumber / getTotalPages()) * 100)
        });
        setNotebook(updatedNotebook);
      }

      return savedPage;
    } catch (err) {
      console.error('Error saving page:', err);
      throw err;
    }
  }, [notebook, currentPageNumber, savePage, updateNotebook, getCurrentCanvasData]);

  // Get total pages allowed for this notebook
  const getTotalPages = useCallback(() => {
    // Use totalPages if available (new format), otherwise fall back to pages for old format
    return notebook?.totalPages || notebook?.pages || 100;
  }, [notebook]);

  // Navigate to a specific page - simplified without settings
  const navigateToPage = useCallback(async (pageNumber, saveCurrentFirst = true) => {
    const totalPages = getTotalPages();
    if (!notebook || pageNumber < 1 || pageNumber > totalPages) return;

    console.log(`Navigating to page ${pageNumber}`);
    
    // Save current page if requested and different from target page
    if (saveCurrentFirst && currentPageNumber !== pageNumber && currentPageData) {
      console.log(`Saving current page ${currentPageNumber} before navigation`);
      try {
        // Get the latest canvas data before saving
        const vectorData = getCurrentCanvasData ? getCurrentCanvasData() : 
                          (currentPageData?.canvasData || JSON.stringify({
                            type: 'drawing',
                            version: 1,
                            elements: [],
                            appState: {
                              width: 870,
                              height: 870
                            }
                          }));
        
        await saveCurrentPage(vectorData);
        console.log(`Successfully saved page ${currentPageNumber} before navigation`);
      } catch (error) {
        console.error(`Error saving page ${currentPageNumber} before navigation:`, error);
        // Continue with navigation even if save fails
      }
    }
    
    setCurrentPageNumber(pageNumber);

    // Try to load existing page data
    const pageId = `${notebook.id}_page_${pageNumber}`;
    try {
      console.log(`Attempting to load page: ${pageId}`);
      const pageData = await loadPage(pageId);
      console.log(`Successfully loaded page ${pageNumber} with data:`, pageData.canvasData?.length || 0, 'characters');
      setCurrentPageData(pageData);
    } catch (error) {
      // Page doesn't exist yet, create empty page data
      console.log(`Creating new page ${pageNumber}`);
      const emptyPageData = {
        id: pageId,
        notebookId: notebook.id,
        pageNumber,
        canvasData: JSON.stringify({
          type: 'drawing',
          version: 1,
          elements: [],
          appState: {
            width: 870,
            height: 870
          }
        }),
        settings: {
          pattern: 'grid',
          patternSize: 20,
          patternColor: '#e5e7eb',
          patternOpacity: 50
        }
      };
      
      console.log(`Setting empty page data for page ${pageNumber}`);
      setCurrentPageData(emptyPageData);
      
      // Save the new empty page immediately
      try {
        const savedPage = await savePage(emptyPageData);
        setCurrentPageData(savedPage);
        
        // Update pages array
        setPages(prev => {
          const index = prev.findIndex(p => p.pageNumber === pageNumber);
          if (index >= 0) {
            return prev;
          } else {
            return [...prev, savedPage].sort((a, b) => a.pageNumber - b.pageNumber);
          }
        });
        
        // Update notebook with the new page reference
        if (notebook.pages && !notebook.pages.includes(savedPage.id)) {
          const updatedNotebook = await updateNotebook(notebook.id, {
            pages: [...(notebook.pages || []), savedPage.id],
            currentPage: pageNumber,
            progress: Math.round((pageNumber / totalPages) * 100)
          });
          setNotebook(updatedNotebook);
        }
        console.log(`Successfully created and saved page ${pageNumber}`);
      } catch (saveError) {
        console.error('Error saving new page:', saveError);
        // Keep the temporary page data even if save fails
      }
    }
  }, [notebook, loadPage, getTotalPages, 
      savePage, updateNotebook, currentPageNumber, currentPageData, 
      saveCurrentPage, getCurrentCanvasData]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    const totalPages = getTotalPages();
    if (currentPageNumber < totalPages) {
      navigateToPage(currentPageNumber + 1, true); // true = save current page first
    }
  }, [currentPageNumber, getTotalPages, navigateToPage]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (currentPageNumber > 1) {
      navigateToPage(currentPageNumber - 1, true); // true = save current page first
    }
  }, [currentPageNumber, navigateToPage]);

  // Add a new page - this will create a new page up to the total pages limit
  const addNewPage = useCallback(async () => {
    if (!notebook) return;

    const totalPages = getTotalPages();
    const newPageNumber = pages.length + 1;
    
    if (newPageNumber > totalPages) {
      console.warn(`Cannot add page ${newPageNumber}. Limit is ${totalPages} pages.`);
      return;
    }

    await navigateToPage(newPageNumber);
  }, [notebook, pages, getTotalPages, navigateToPage]);

  return {
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
    addNewPage,
    reload: loadNotebookData,
    totalPages: getTotalPages(),
    getCurrentCanvasData
  };
};