// context/NotebookContextWithFS.jsx - Updated with data directory management
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

// For Electron integration
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

// Create the context
const NotebookContext = createContext();

// Custom hook to use the context
export const useNotebooks = () => {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error('useNotebooks must be used within a NotebookProvider');
  }
  return context;
};

// Enhanced Notebook provider component with filesystem integration
export const NotebookProvider = ({ children }) => {
  const [notebooks, setNotebooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentNotebook, setCurrentNotebook] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataDirectoryInfo, setDataDirectoryInfo] = useState(null);

  // Check if running in Electron
  const isElectron = !!ipcRenderer;

  // Use useMemo for filtering instead of useEffect to prevent infinite loops
  const filteredNotebooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return notebooks;
    }
    
    return notebooks.filter(notebook =>
      notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notebook.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notebooks, searchQuery]);

  // Initialize - Load notebooks from filesystem and get directory info
  useEffect(() => {
    loadDataDirectoryInfo();
    loadNotebooks();
    loadAppSettings();
  }, []);

  // Load data directory information
  const loadDataDirectoryInfo = async () => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-get-directory-info');
        if (result.success) {
          setDataDirectoryInfo(result.directoryInfo);
          return result.directoryInfo;
        }
      } catch (error) {
        console.error('Error loading data directory info:', error);
      }
    }
    return null;
  };

  // Select new data directory
  const selectDataDirectory = async () => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-select-directory');
        if (result.success) {
          setDataDirectoryInfo({ ...dataDirectoryInfo, baseDir: result.path });
          // Reload notebooks from new directory
          await loadNotebooks();
          return result;
        } else {
          setError(result.error);
          return result;
        }
      } catch (error) {
        console.error('Error selecting data directory:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: 'Directory selection not available in web version' };
    }
  };

  // Change data directory programmatically
  const changeDataDirectory = async (newPath) => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-change-directory', newPath);
        if (result.success) {
          setDataDirectoryInfo({ ...dataDirectoryInfo, baseDir: result.path });
          await loadNotebooks();
          return result;
        } else {
          setError(result.error);
          return result;
        }
      } catch (error) {
        console.error('Error changing data directory:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: 'Directory change not available in web version' };
    }
  };

  // Reset to default data directory
  const resetToDefaultDirectory = async () => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-reset-to-default-directory');
        if (result.success) {
          setDataDirectoryInfo({ ...dataDirectoryInfo, baseDir: result.path });
          await loadNotebooks();
          return result;
        } else {
          setError(result.error);
          return result;
        }
      } catch (error) {
        console.error('Error resetting to default directory:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: 'Directory reset not available in web version' };
    }
  };

  // Export all data
  const exportAllData = async () => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-export-all-data');
        return result;
      } catch (error) {
        console.error('Error exporting data:', error);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: 'Export not available in web version' };
    }
  };

  // Import data
  const importData = async () => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-import-data');
        if (result.success) {
          // Reload notebooks after import
          await loadNotebooks();
        }
        return result;
      } catch (error) {
        console.error('Error importing data:', error);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: 'Import not available in web version' };
    }
  };

  // Load all notebooks from filesystem
  const loadNotebooks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-load-all-notebooks');
        if (result.success) {
          setNotebooks(result.notebooks);
        } else {
          throw new Error(result.error);
        }
      } else {
        // Fallback to localStorage for web version
        const savedNotebooks = localStorage.getItem('notebooks');
        if (savedNotebooks) {
          setNotebooks(JSON.parse(savedNotebooks));
        }
      }
    } catch (error) {
      console.error('Error loading notebooks:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Save notebook to filesystem
  const saveNotebook = async (notebook) => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-save-notebook', notebook);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.notebook;
      } else {
        // Fallback to localStorage
        const updatedNotebooks = notebooks.map(nb => 
          nb.id === notebook.id ? notebook : nb
        );
        if (!notebooks.find(nb => nb.id === notebook.id)) {
          updatedNotebooks.unshift(notebook);
        }
        setNotebooks(updatedNotebooks);
        localStorage.setItem('notebooks', JSON.stringify(updatedNotebooks));
        return notebook;
      }
    } catch (error) {
      console.error('Error saving notebook:', error);
      setError(error.message);
      throw error;
    }
  };

  // Load a specific notebook
  const loadNotebook = async (notebookId) => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-load-notebook', notebookId);
        if (result.success) {
          setCurrentNotebook(result.notebook);
          return result.notebook;
        } else {
          throw new Error(result.error);
        }
      } else {
        const notebook = notebooks.find(nb => nb.id === parseInt(notebookId));
        setCurrentNotebook(notebook);
        return notebook;
      }
    } catch (error) {
      console.error('Error loading notebook:', error);
      setError(error.message);
      throw error;
    }
  };

  // Add a new notebook
  const addNotebook = async (notebookData) => {
    try {
      const colorGradients = {
        '#8b5cf6': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
        '#ef4444': 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
        '#f59e0b': 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
        '#10b981': 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
        '#3b82f6': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
        '#ec4899': 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
        '#14b8a6': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
        '#f97316': 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)'
      };

      const notebookId = Date.now();
      const newNotebook = {
        id: notebookId,
        ...notebookData,
        gradient: colorGradients[notebookData.color] || colorGradients['#8b5cf6'],
        currentPage: 1,
        progress: 0,
        pages: [],
        createdAt: new Date().toISOString()
      };

      // Save the notebook first
      const savedNotebook = await saveNotebook(newNotebook);
      
      // Create the first page immediately with default settings
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
        
        const updatedNotebook = {
          ...savedNotebook,
          pages: [savedPage.id],
          currentPage: 1,
          totalPages: notebookData.pages
        };
        
        await saveNotebook(updatedNotebook);
        await loadNotebooks();
        return updatedNotebook;
      } catch (pageError) {
        console.error('Error creating first page:', pageError);
        await loadNotebooks();
        return savedNotebook;
      }
    } catch (error) {
      console.error('Error adding notebook:', error);
      throw error;
    }
  };

  // Update a notebook
  const updateNotebook = async (id, updates) => {
    try {
      const notebook = notebooks.find(nb => nb.id === id);
      if (!notebook) {
        throw new Error('Notebook not found');
      }

      const updatedNotebook = { ...notebook, ...updates };
      await saveNotebook(updatedNotebook);
      await loadNotebooks();
      return updatedNotebook;
    } catch (error) {
      console.error('Error updating notebook:', error);
      throw error;
    }
  };

  // Delete a notebook
  const deleteNotebook = async (id) => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-delete-notebook', id);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const updatedNotebooks = notebooks.filter(nb => nb.id !== id);
        setNotebooks(updatedNotebooks);
        localStorage.setItem('notebooks', JSON.stringify(updatedNotebooks));
      }
      await loadNotebooks();
    } catch (error) {
      console.error('Error deleting notebook:', error);
      throw error;
    }
  };

  // Save a page - simplified to just save the data as provided
  const savePage = async (pageData) => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-save-page', pageData);
        if (!result.success) {
          throw new Error(result.error);
        }
        setCurrentPage(result.page);
        return result.page;
      } else {
        // For web version
        const notebookId = pageData.notebookId;
        const pageId = `${notebookId}_page_${pageData.pageNumber}`;
        
        const page = {
          id: pageId,
          notebookId,
          pageNumber: pageData.pageNumber,
          canvasData: pageData.canvasData,
          settings: pageData.settings,
          lastModified: new Date().toISOString()
        };
        
        // Store in localStorage
        const pagesKey = `notebook_${notebookId}_pages`;
        const existingPages = JSON.parse(localStorage.getItem(pagesKey) || '[]');
        const existingPageIndex = existingPages.findIndex(p => p.id === pageId);
        
        if (existingPageIndex >= 0) {
          existingPages[existingPageIndex] = page;
        } else {
          existingPages.push(page);
        }
        
        localStorage.setItem(pagesKey, JSON.stringify(existingPages));
        setCurrentPage(page);
        return page;
      }
    } catch (error) {
      console.error('Error saving page:', error);
      throw error;
    }
  };

  // Load a page
  const loadPage = async (pageId) => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-load-page', pageId);
        if (result.success) {
          setCurrentPage(result.page);
          return result.page;
        } else {
          throw new Error(result.error);
        }
      } else {
        // Extract notebook ID from page ID for localStorage
        const [notebookId] = pageId.split('_page_');
        const pagesKey = `notebook_${notebookId}_pages`;
        const pages = JSON.parse(localStorage.getItem(pagesKey) || '[]');
        const page = pages.find(p => p.id === pageId);
        
        if (page) {
          setCurrentPage(page);
          return page;
        } else {
          throw new Error('Page not found');
        }
      }
    } catch (error) {
      console.error('Error loading page:', error);
      throw error;
    }
  };

  // Load pages by notebook
  const loadPagesByNotebook = async (notebookId) => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-load-pages-by-notebook', notebookId);
        if (result.success) {
          return result.pages;
        } else {
          throw new Error(result.error);
        }
      } else {
        const pagesKey = `notebook_${notebookId}_pages`;
        const pages = JSON.parse(localStorage.getItem(pagesKey) || '[]');
        return pages.sort((a, b) => a.pageNumber - b.pageNumber);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      throw error;
    }
  };

  // Load app settings
  const loadAppSettings = async () => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-load-app-settings');
        if (result.success) {
          return result.settings;
        }
      } else {
        const settings = localStorage.getItem('appSettings');
        return settings ? JSON.parse(settings) : null;
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  };

  // Save app settings
  const saveAppSettings = async (settings) => {
    try {
      if (isElectron) {
        const result = await ipcRenderer.invoke('data-save-app-settings', settings);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        localStorage.setItem('appSettings', JSON.stringify(settings));
      }
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  };

  // Get a specific notebook (for compatibility with existing code)
  const getNotebook = (id) => {
    return notebooks.find(notebook => notebook.id === parseInt(id));
  };

  // Update search query
  const updateSearchQuery = (query) => {
    setSearchQuery(query);
  };

  // Create backup
  const createBackup = async () => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-create-backup');
        return result;
      } catch (error) {
        console.error('Error creating backup:', error);
        throw error;
      }
    } else {
      console.warn('Backup not available in web version');
      return { success: false, error: 'Backup not available in web version' };
    }
  };

  // Get storage statistics
  const getStorageStats = async () => {
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('data-get-storage-stats');
        return result;
      } catch (error) {
        console.error('Error getting storage stats:', error);
        throw error;
      }
    } else {
      return { success: false, error: 'Storage stats not available in web version' };
    }
  };

  const value = {
    // Data
    notebooks,
    filteredNotebooks,
    searchQuery,
    currentNotebook,
    currentPage,
    isLoading,
    error,
    dataDirectoryInfo,
    
    // Notebook functions
    addNotebook,
    updateNotebook,
    deleteNotebook,
    getNotebook,
    loadNotebook,
    loadNotebooks,
    
    // Page functions
    savePage,
    loadPage,
    loadPagesByNotebook,
    
    // Settings functions
    loadAppSettings,
    saveAppSettings,
    
    // Search
    updateSearchQuery,
    
    // Data directory management
    loadDataDirectoryInfo,
    selectDataDirectory,
    changeDataDirectory,
    resetToDefaultDirectory,
    
    // Import/Export
    exportAllData,
    importData,
    
    // Utility functions
    createBackup,
    getStorageStats
  };

  return (
    <NotebookContext.Provider value={value}>
      {children}
    </NotebookContext.Provider>
  );
};