// public/electron-data-handler.js - Electron main process data handler
const { ipcMain } = require('electron');
const DataManager = require('../data/DataManager');

class ElectronDataHandler {
  constructor() {
    // Initialize DataManager
    this.dataManager = new DataManager();
    
    // Register IPC handlers
    this.registerHandlers();
  }

  registerHandlers() {
    // Notebook handlers
    ipcMain.handle('data-save-notebook', async (event, notebook) => {
      return await this.dataManager.saveNotebook(notebook);
    });

    ipcMain.handle('data-load-notebook', async (event, notebookId) => {
      return await this.dataManager.loadNotebook(notebookId);
    });

    ipcMain.handle('data-load-all-notebooks', async (event) => {
      return await this.dataManager.loadAllNotebooks();
    });

    ipcMain.handle('data-delete-notebook', async (event, notebookId) => {
      return await this.dataManager.deleteNotebook(notebookId);
    });

    // Page handlers
    ipcMain.handle('data-save-page', async (event, pageData) => {
      return await this.dataManager.savePage(pageData);
    });

    ipcMain.handle('data-load-page', async (event, pageId) => {
      return await this.dataManager.loadPage(pageId);
    });

    ipcMain.handle('data-load-pages-by-notebook', async (event, notebookId) => {
      return await this.dataManager.loadPagesByNotebook(notebookId);
    });

    ipcMain.handle('data-delete-page', async (event, pageId) => {
      return await this.dataManager.deletePage(pageId);
    });

    // Settings handlers
    ipcMain.handle('data-save-app-settings', async (event, settings) => {
      return await this.dataManager.saveAppSettings(settings);
    });

    ipcMain.handle('data-load-app-settings', async (event) => {
      return await this.dataManager.loadAppSettings();
    });

    // Utility handlers
    ipcMain.handle('data-create-backup', async (event) => {
      return await this.dataManager.createBackup();
    });

    ipcMain.handle('data-get-storage-stats', async (event) => {
      return await this.dataManager.getStorageStats();
    });
  }
}

module.exports = ElectronDataHandler;