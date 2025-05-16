// hooks/useNotebookData.js - Fixed to properly clear canvas when navigating to new pages
import { useState, useEffect, useCallback } from 'react';
import { useNotebooks } from '../context/NotebookContextWithFS';

export const useNotebookData = (notebookId) => {
  const {
    loadNotebook,
    updateNotebook,
    savePage,
    loadPage,
    loadPagesByNotebook,
    pageSettings,
    updatePageSettings
  } = useNotebooks();

  const [notebook, setNotebook] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [currentPageData, setCurrentPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          settings: pageSettings
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
            settings: pageSettings
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
        if (currentPage.settings) {
          updatePageSettings(currentPage.settings);
        }
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save current page with canvas data
  const saveCurrentPage = useCallback(async (canvasData) => {
    if (!notebook) return;

    try {
      console.log('Saving page data:', { 
        pageNumber: currentPageNumber, 
        hasData: !!canvasData,
        dataType: typeof canvasData,
        dataLength: canvasData ? canvasData.length : 0
      });

      const pageData = {
        notebookId: notebook.id,
        pageNumber: currentPageNumber,
        canvasData,
        settings: pageSettings
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
  }, [notebook, currentPageNumber, pageSettings, savePage, updateNotebook]);

  // Get total pages allowed for this notebook
  const getTotalPages = useCallback(() => {
    // Use totalPages if available (new format), otherwise fall back to pages for old format
    return notebook?.totalPages || notebook?.pages || 100;
  }, [notebook]);

  // Navigate to a specific page - with automatic page creation and proper canvas handling
  const navigateToPage = useCallback(async (pageNumber) => {
    const totalPages = getTotalPages();
    if (!notebook || pageNumber < 1 || pageNumber > totalPages) return;

    console.log(`Navigating to page ${pageNumber}`);
    setCurrentPageNumber(pageNumber);

    // Try to load existing page data
    const pageId = `${notebook.id}_page_${pageNumber}`;
    try {
      console.log(`Attempting to load page: ${pageId}`);
      const pageData = await loadPage(pageId);
      console.log(`Successfully loaded page ${pageNumber} with data:`, pageData.canvasData?.length || 0, 'characters');
      setCurrentPageData(pageData);
      if (pageData.settings) {
        updatePageSettings(pageData.settings);
      }
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
        settings: pageSettings
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
  }, [notebook, loadPage, pageSettings, updatePageSettings, getTotalPages, savePage, updateNotebook]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    const totalPages = getTotalPages();
    if (currentPageNumber < totalPages) {
      navigateToPage(currentPageNumber + 1);
    }
  }, [currentPageNumber, getTotalPages, navigateToPage]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (currentPageNumber > 1) {
      navigateToPage(currentPageNumber - 1);
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
    totalPages: getTotalPages()
  };
};