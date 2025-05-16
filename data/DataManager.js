// data/DataManager.js - Main data management class
const fs = require('fs').promises;
const path = require('path');

class DataManager {
  constructor(baseDir = './data') {
    this.baseDir = baseDir;
    this.notebooksDir = path.join(baseDir, 'notebooks');
    this.pagesDir = path.join(baseDir, 'pages');
    this.settingsDir = path.join(baseDir, 'settings');
    
    // Initialize directories on startup
    this.init();
  }

  // Initialize required directories
  async init() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(this.notebooksDir, { recursive: true });
      await fs.mkdir(this.pagesDir, { recursive: true });
      await fs.mkdir(this.settingsDir, { recursive: true });
    } catch (error) {
      console.error('Error initializing directories:', error);
    }
  }

  // NOTEBOOK FUNCTIONS
  
  // Save a notebook
async saveNotebook(notebook) {
  try {
    const filePath = path.join(this.notebooksDir, `${notebook.id}.json`);
    const notebookData = {
      ...notebook,
      lastModified: new Date().toISOString(),
      pages: notebook.pages || [], // Array of page IDs
      totalPages: notebook.totalPages || notebook.pages || 100 // Store the pages limit
    };
    await fs.writeFile(filePath, JSON.stringify(notebookData, null, 2));
    return { success: true, notebook: notebookData };
  } catch (error) {
    console.error('Error saving notebook:', error);
    return { success: false, error: error.message };
  }
}

  // Load a notebook by ID
  async loadNotebook(notebookId) {
    try {
      const filePath = path.join(this.notebooksDir, `${notebookId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, notebook: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Notebook not found' };
      }
      console.error('Error loading notebook:', error);
      return { success: false, error: error.message };
    }
  }

  // Load all notebooks
  async loadAllNotebooks() {
    try {
      const files = await fs.readdir(this.notebooksDir);
      const notebooks = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.notebooksDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          notebooks.push(JSON.parse(data));
        }
      }
      
      // Sort by creation date (newest first)
      notebooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, notebooks };
    } catch (error) {
      console.error('Error loading notebooks:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a notebook and all its pages
  async deleteNotebook(notebookId) {
    try {
      // First, load the notebook to get its pages
      const notebookResult = await this.loadNotebook(notebookId);
      if (!notebookResult.success) {
        return notebookResult;
      }

      const notebook = notebookResult.notebook;
      
      // Delete all pages belonging to this notebook
      if (notebook.pages && notebook.pages.length > 0) {
        for (const pageId of notebook.pages) {
          await this.deletePage(pageId);
        }
      }

      // Delete the notebook file
      const filePath = path.join(this.notebooksDir, `${notebookId}.json`);
      await fs.unlink(filePath);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting notebook:', error);
      return { success: false, error: error.message };
    }
  }

  // PAGE FUNCTIONS
  
  // Save a page (includes canvas data and settings)
  async savePage(pageData) {
    try {
      const { notebookId, pageNumber, canvasData, settings, ...otherData } = pageData;
      const pageId = `${notebookId}_page_${pageNumber}`;
      
      const page = {
        id: pageId,
        notebookId,
        pageNumber,
        canvasData, // This will be the base64 image data from canvas
        settings: settings || {
          pattern: 'grid',
          patternSize: 20,
          patternColor: '#e5e7eb',
          patternOpacity: 50
        },
        lastModified: new Date().toISOString(),
        ...otherData
      };

      const filePath = path.join(this.pagesDir, `${pageId}.json`);
      await fs.writeFile(filePath, JSON.stringify(page, null, 2));
      
      // Update notebook's pages array
      await this.addPageToNotebook(notebookId, pageId);
      
      return { success: true, page };
    } catch (error) {
      console.error('Error saving page:', error);
      return { success: false, error: error.message };
    }
  }

  // Load a page by ID
  async loadPage(pageId) {
    try {
      const filePath = path.join(this.pagesDir, `${pageId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, page: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Page not found' };
      }
      console.error('Error loading page:', error);
      return { success: false, error: error.message };
    }
  }

  // Load pages by notebook ID
  async loadPagesByNotebook(notebookId) {
    try {
      const notebookResult = await this.loadNotebook(notebookId);
      if (!notebookResult.success) {
        return notebookResult;
      }

      const notebook = notebookResult.notebook;
      const pages = [];

      if (notebook.pages && notebook.pages.length > 0) {
        for (const pageId of notebook.pages) {
          const pageResult = await this.loadPage(pageId);
          if (pageResult.success) {
            pages.push(pageResult.page);
          }
        }
      }

      // Sort pages by page number
      pages.sort((a, b) => a.pageNumber - b.pageNumber);

      return { success: true, pages };
    } catch (error) {
      console.error('Error loading pages:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a page
  async deletePage(pageId) {
    try {
      const filePath = path.join(this.pagesDir, `${pageId}.json`);
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting page:', error);
      return { success: false, error: error.message };
    }
  }

  // Add page to notebook's pages array
  async addPageToNotebook(notebookId, pageId) {
    try {
      const notebookResult = await this.loadNotebook(notebookId);
      if (!notebookResult.success) {
        return notebookResult;
      }

      const notebook = notebookResult.notebook;
      if (!notebook.pages) {
        notebook.pages = [];
      }

      // Add page if not already present
      if (!notebook.pages.includes(pageId)) {
        notebook.pages.push(pageId);
        await this.saveNotebook(notebook);
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding page to notebook:', error);
      return { success: false, error: error.message };
    }
  }

  // SETTINGS FUNCTIONS
  
  // Save global app settings
  async saveAppSettings(settings) {
    try {
      const filePath = path.join(this.settingsDir, 'app-settings.json');
      const appSettings = {
        ...settings,
        lastModified: new Date().toISOString()
      };
      await fs.writeFile(filePath, JSON.stringify(appSettings, null, 2));
      return { success: true, settings: appSettings };
    } catch (error) {
      console.error('Error saving app settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Load global app settings
  async loadAppSettings() {
    try {
      const filePath = path.join(this.settingsDir, 'app-settings.json');
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, settings: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Return default settings if file doesn't exist
        const defaultSettings = {
          theme: 'light',
          defaultPenSettings: {
            color: '#000000',
            strokeWidth: 5,
            opacity: 100
          },
          defaultPageSettings: {
            pattern: 'grid',
            patternSize: 20,
            patternColor: '#e5e7eb',
            patternOpacity: 50
          }
        };
        return { success: true, settings: defaultSettings };
      }
      console.error('Error loading app settings:', error);
      return { success: false, error: error.message };
    }
  }

  // UTILITY FUNCTIONS
  
  // Backup all data
  async createBackup() {
    try {
      const backupDir = path.join(this.baseDir, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup-${timestamp}`);
      
      // Copy all directories to backup
      await this.copyDirectory(this.notebooksDir, path.join(backupPath, 'notebooks'));
      await this.copyDirectory(this.pagesDir, path.join(backupPath, 'pages'));
      await this.copyDirectory(this.settingsDir, path.join(backupPath, 'settings'));
      
      return { success: true, backupPath };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error: error.message };
    }
  }

  // Copy directory recursively
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = await fs.stat(srcPath);
      
      if (stat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const notebookFiles = await fs.readdir(this.notebooksDir);
      const pageFiles = await fs.readdir(this.pagesDir);
      
      let totalSize = 0;
      
      // Calculate total size of notebook files
      for (const file of notebookFiles) {
        if (file.endsWith('.json')) {
          const stat = await fs.stat(path.join(this.notebooksDir, file));
          totalSize += stat.size;
        }
      }
      
      // Calculate total size of page files
      for (const file of pageFiles) {
        if (file.endsWith('.json')) {
          const stat = await fs.stat(path.join(this.pagesDir, file));
          totalSize += stat.size;
        }
      }
      
      return {
        success: true,
        stats: {
          notebookCount: notebookFiles.filter(f => f.endsWith('.json')).length,
          pageCount: pageFiles.filter(f => f.endsWith('.json')).length,
          totalSizeBytes: totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        }
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = DataManager;