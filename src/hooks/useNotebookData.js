// hooks/useNotebookData.js - Fixed to ensure proper data loading
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

      // Load current page if it exists
      if (pagesData.length > 0) {
        const currentPage = pagesData.find(p => p.pageNumber === currentPageNumber) || pagesData[0];
     
        
        setCurrentPageData(currentPage);
        if (currentPage.settings) {
          updatePageSettings(currentPage.settings);
        }
      } else {
        // No pages exist, create empty page data
        const emptyPageData = {
          id: `${notebookId}_page_${currentPageNumber}`,
          notebookId: notebookId,
          pageNumber: currentPageNumber,
          canvasData: null,
          settings: pageSettings
        };
        setCurrentPageData(emptyPageData);
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

      // FIXED: Ensure page is linked to notebook
      // Check if notebook has this page in its pages array
      const pageId = savedPage.id;
      if (notebook.pages && !notebook.pages.includes(pageId)) {
        // Update notebook with the page reference
        const updatedNotebook = await updateNotebook(notebook.id, {
          pages: [...(notebook.pages || []), pageId],
          currentPage: currentPageNumber,
          progress: Math.round((currentPageNumber / notebook.pages) * 100)
        });
        setNotebook(updatedNotebook);
      } else {
        // Just update progress
        const progress = (currentPageNumber / notebook.pages) * 100;
        const updatedNotebook = await updateNotebook(notebook.id, {
          currentPage: currentPageNumber,
          progress: Math.round(progress)
        });
        setNotebook(updatedNotebook);
      }

      return savedPage;
    } catch (err) {
      console.error('Error saving page:', err);
      throw err;
    }
  }, [notebook, currentPageNumber, pageSettings, savePage, updateNotebook]);

  // Navigate to a specific page
  const navigateToPage = useCallback(async (pageNumber) => {
    if (!notebook || pageNumber < 1 || pageNumber > notebook.pages) return;

    setCurrentPageNumber(pageNumber);

    // Try to load existing page data
    const pageId = `${notebook.id}_page_${pageNumber}`;
    try {
      const pageData = await loadPage(pageId);
      setCurrentPageData(pageData);
      if (pageData.settings) {
        updatePageSettings(pageData.settings);
      }
    } catch (error) {
      // Page doesn't exist yet, create empty page data
      const emptyPageData = {
        id: pageId,
        notebookId: notebook.id,
        pageNumber,
        canvasData: null,
        settings: pageSettings
      };
      setCurrentPageData(emptyPageData);
    }
  }, [notebook, loadPage, pageSettings, updatePageSettings]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    if (currentPageNumber < notebook?.pages) {
      navigateToPage(currentPageNumber + 1);
    }
  }, [currentPageNumber, notebook, navigateToPage]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (currentPageNumber > 1) {
      navigateToPage(currentPageNumber - 1);
    }
  }, [currentPageNumber, navigateToPage]);

  // Add a new page
  const addNewPage = useCallback(async () => {
    if (!notebook) return;

    const newPageNumber = pages.length + 1;
    await navigateToPage(newPageNumber);
    
    // Update notebook with new page count
    const updatedNotebook = await updateNotebook(notebook.id, {
      pages: Math.max(notebook.pages, newPageNumber)
    });
    setNotebook(updatedNotebook);
  }, [notebook, pages, navigateToPage, updateNotebook]);

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
    reload: loadNotebookData
  };
};