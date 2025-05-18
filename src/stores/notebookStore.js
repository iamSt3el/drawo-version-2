// src/stores/notebookStore.js
import {create} from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotebookStore = create(
  persist(
    (set, get) => ({
      // State
      notebooks: [],
      currentNotebookId: null,
      currentPageNumber: 1,
      searchQuery: '',
      
      // Computed values
      // This isn't stored but derived on each access
      get filteredNotebooks() {
        const { notebooks, searchQuery } = get();
        if (!searchQuery.trim()) return notebooks;
        
        return notebooks.filter(notebook => 
          notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notebook.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      },
      
      get currentNotebook() {
        return get().notebooks.find(nb => nb.id === get().currentNotebookId) || null;
      },
      
      // Actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setCurrentNotebook: (id) => set({ 
        currentNotebookId: id,
        currentPageNumber: 1 // Reset to first page
      }),
      
      setCurrentPage: (pageNumber) => set({ currentPageNumber: pageNumber }),
      
      addNotebook: (notebookData) => {
        const newNotebook = {
          id: Date.now(), // Simple ID generation
          ...notebookData,
          pages: [],
          currentPage: 1,
          progress: 0,
          createdAt: new Date().toISOString(),
          gradient: getGradientForColor(notebookData.color)
        };
        
        set(state => ({
          notebooks: [newNotebook, ...state.notebooks]
        }));
        
        return newNotebook;
      },
      
      updateNotebook: (id, updates) => {
        set(state => ({
          notebooks: state.notebooks.map(notebook => 
            notebook.id === id ? { ...notebook, ...updates } : notebook
          )
        }));
      },
      
      deleteNotebook: (id) => {
        set(state => ({
          notebooks: state.notebooks.filter(notebook => notebook.id !== id),
          // Reset current notebook if it was deleted
          currentNotebookId: state.currentNotebookId === id ? null : state.currentNotebookId
        }));
      },
      
      // Page operations
      savePage: (pageData) => {
        const { notebookId, pageNumber, canvasData, settings } = pageData;
        const pageId = `${notebookId}_page_${pageNumber}`;
        
        // Update the pages array in the notebook
        set(state => {
          const updatedNotebooks = state.notebooks.map(notebook => {
            if (notebook.id !== notebookId) return notebook;
            
            // Find the page if it exists
            const pageExists = notebook.pages.includes(pageId);
            let updatedPages = [...notebook.pages];
            
            if (!pageExists) {
              updatedPages.push(pageId);
            }
            
            // Calculate progress
            const totalPages = notebook.totalPages || 100;
            const progress = Math.round((pageNumber / totalPages) * 100);
            
            return {
              ...notebook,
              pages: updatedPages,
              currentPage: pageNumber,
              progress
            };
          });
          
          return { notebooks: updatedNotebooks };
        });
        
        // Save page data to localStorage or storage service
        const page = {
          id: pageId,
          notebookId,
          pageNumber,
          canvasData,
          settings,
          lastModified: new Date().toISOString()
        };
        
        // Store in localStorage (you'll replace this with a proper storage service)
        localStorage.setItem(`page_${pageId}`, JSON.stringify(page));
        
        return { success: true, page };
      },
      
      loadPage: (notebookId, pageNumber) => {
        const pageId = `${notebookId}_page_${pageNumber}`;
        
        // Load from localStorage (you'll replace this with a proper storage service)
        const pageData = localStorage.getItem(`page_${pageId}`);
        
        if (!pageData) {
          // Return empty page data
          return {
            success: false,
            error: 'Page not found',
            page: {
              id: pageId,
              notebookId,
              pageNumber,
              canvasData: null,
              settings: {
                pattern: 'grid',
                patternSize: 20,
                patternColor: '#e5e7eb',
                patternOpacity: 50
              }
            }
          };
        }
        
        return { success: true, page: JSON.parse(pageData) };
      },
      
      // Load all pages for a notebook
      loadPagesByNotebook: (notebookId) => {
        const { notebooks } = get();
        const notebook = notebooks.find(nb => nb.id === notebookId);
        
        if (!notebook) return { success: false, error: 'Notebook not found' };
        
        const pages = [];
        
        notebook.pages.forEach(pageId => {
          const pageData = localStorage.getItem(`page_${pageId}`);
          if (pageData) {
            pages.push(JSON.parse(pageData));
          }
        });
        
        return { success: true, pages };
      }
    }),
    {
      name: 'drawo-notebooks', // localStorage key
      getStorage: () => localStorage, // storage function
    }
  )
);

// Helper for gradient generation
function getGradientForColor(color) {
  const colorGradients = {
    '#8b5cf6': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
    '#ef4444': 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    '#f59e0b': 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
    // Add other colors...
  };
  
  return colorGradients[color] || colorGradients['#8b5cf6']; // Default gradient
}