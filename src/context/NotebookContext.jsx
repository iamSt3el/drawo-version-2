import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the context
const NotebookContext = createContext();

// Create a custom hook to use the context
export const useNotebooks = () => {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error('useNotebooks must be used within a NotebookProvider');
  }
  return context;
};

// Notebook provider component
export const NotebookProvider = ({ children }) => {
  const [notebooks, setNotebooks] = useState([]);
  const [filteredNotebooks, setFilteredNotebooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load notebooks from localStorage on mount
  useEffect(() => {
    const savedNotebooks = localStorage.getItem('notebooks');
    if (savedNotebooks) {
      const parsed = JSON.parse(savedNotebooks);
      setNotebooks(parsed);
      setFilteredNotebooks(parsed);
    } else {
      // Initialize with some sample data
      const sampleNotebooks = [
        {
          id: 1,
          title: "Data Structures & Algorithms",
          description: "This notebook contains notes about DSA. Like Array, linked list and trees.",
          color: "#8b5cf6",
          gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
          pages: 100,
          currentPage: 25,
          progress: 25,
          date: "14/05/2025",
          createdAt: new Date().toISOString()
        }
      ];
      setNotebooks(sampleNotebooks);
      setFilteredNotebooks(sampleNotebooks);
      localStorage.setItem('notebooks', JSON.stringify(sampleNotebooks));
    }
  }, []);

  // Save to localStorage whenever notebooks change
  useEffect(() => {
    localStorage.setItem('notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

  // Filter notebooks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotebooks(notebooks);
    } else {
      const filtered = notebooks.filter(notebook =>
        notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notebook.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredNotebooks(filtered);
    }
  }, [notebooks, searchQuery]);

  // Function to add a new notebook
  const addNotebook = (notebookData) => {
    // Get the matching gradient for the color
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

    const newNotebook = {
      id: Date.now(), // Simple ID generation
      ...notebookData,
      gradient: colorGradients[notebookData.color] || colorGradients['#8b5cf6'],
      currentPage: 0,
      progress: 0,
      createdAt: new Date().toISOString()
    };

    setNotebooks(prev => [newNotebook, ...prev]);
    return newNotebook;
  };

  // Function to update a notebook
  const updateNotebook = (id, updates) => {
    setNotebooks(prev =>
      prev.map(notebook =>
        notebook.id === id ? { ...notebook, ...updates } : notebook
      )
    );
  };

  // Function to delete a notebook
  const deleteNotebook = (id) => {
    setNotebooks(prev => prev.filter(notebook => notebook.id !== id));
  };

  // Function to get a specific notebook
  const getNotebook = (id) => {
    return notebooks.find(notebook => notebook.id === parseInt(id));
  };

  // Function to update search query
  const updateSearchQuery = (query) => {
    setSearchQuery(query);
  };

  const value = {
    notebooks,
    filteredNotebooks,
    searchQuery,
    addNotebook,
    updateNotebook,
    deleteNotebook,
    getNotebook,
    updateSearchQuery
  };

  return (
    <NotebookContext.Provider value={value}>
      {children}
    </NotebookContext.Provider>
  );
};