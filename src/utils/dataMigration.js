// utils/dataMigration.js - Utility to migrate from localStorage to filesystem
export class DataMigration {
    constructor(dataManager) {
      this.dataManager = dataManager;
    }
  
    // Migrate notebooks from localStorage to filesystem
    async migrateNotebooksFromLocalStorage() {
      try {
        // Check if running in browser
        if (typeof window === 'undefined' || !window.localStorage) {
          console.log('Not in browser environment, skipping localStorage migration');
          return { success: true, message: 'No migration needed' };
        }
  
        // Get notebooks from localStorage
        const notebooksJson = localStorage.getItem('notebooks');
        if (!notebooksJson) {
          console.log('No notebooks found in localStorage');
          return { success: true, message: 'No notebooks to migrate' };
        }
  
        const notebooks = JSON.parse(notebooksJson);
        if (!Array.isArray(notebooks) || notebooks.length === 0) {
          console.log('No valid notebooks found in localStorage');
          return { success: true, message: 'No valid notebooks to migrate' };
        }
  
        console.log(`Found ${notebooks.length} notebooks to migrate`);
  
        // Migrate each notebook
        const results = [];
        for (const notebook of notebooks) {
          try {
            // Save notebook to filesystem
            const result = await this.dataManager.saveNotebook(notebook);
            if (result.success) {
              results.push({ id: notebook.id, status: 'success' });
              console.log(`Migrated notebook: ${notebook.title}`);
            } else {
              results.push({ id: notebook.id, status: 'failed', error: result.error });
              console.error(`Failed to migrate notebook ${notebook.id}:`, result.error);
            }
          } catch (error) {
            results.push({ id: notebook.id, status: 'failed', error: error.message });
            console.error(`Error migrating notebook ${notebook.id}:`, error);
          }
        }
  
        // Migrate pages associated with notebooks
        for (const notebook of notebooks) {
          await this.migratePagesForNotebook(notebook.id);
        }
  
        // Create backup of localStorage data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `notebooks_backup_${timestamp}`;
        localStorage.setItem(backupKey, notebooksJson);
  
        return {
          success: true,
          message: `Migrated ${results.filter(r => r.status === 'success').length} of ${notebooks.length} notebooks`,
          results
        };
      } catch (error) {
        console.error('Error during notebook migration:', error);
        return { success: false, error: error.message };
      }
    }
  
    // Migrate pages for a specific notebook
    async migratePagesForNotebook(notebookId) {
      try {
        const pagesKey = `notebook_${notebookId}_pages`;
        const pagesJson = localStorage.getItem(pagesKey);
        
        if (!pagesJson) {
          console.log(`No pages found for notebook ${notebookId}`);
          return { success: true, message: 'No pages to migrate' };
        }
  
        const pages = JSON.parse(pagesJson);
        if (!Array.isArray(pages) || pages.length === 0) {
          console.log(`No valid pages found for notebook ${notebookId}`);
          return { success: true, message: 'No valid pages to migrate' };
        }
  
        console.log(`Found ${pages.length} pages to migrate for notebook ${notebookId}`);
  
        // Migrate each page
        const results = [];
        for (const page of pages) {
          try {
            const result = await this.dataManager.savePage(page);
            if (result.success) {
              results.push({ id: page.id, status: 'success' });
              console.log(`Migrated page: ${page.id}`);
            } else {
              results.push({ id: page.id, status: 'failed', error: result.error });
              console.error(`Failed to migrate page ${page.id}:`, result.error);
            }
          } catch (error) {
            results.push({ id: page.id, status: 'failed', error: error.message });
            console.error(`Error migrating page ${page.id}:`, error);
          }
        }
  
        // Create backup of pages localStorage data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `pages_backup_${notebookId}_${timestamp}`;
        localStorage.setItem(backupKey, pagesJson);
  
        return {
          success: true,
          message: `Migrated ${results.filter(r => r.status === 'success').length} of ${pages.length} pages`,
          results
        };
      } catch (error) {
        console.error(`Error migrating pages for notebook ${notebookId}:`, error);
        return { success: false, error: error.message };
      }
    }
  
    // Migrate app settings
    async migrateAppSettings() {
      try {
        const settingsJson = localStorage.getItem('appSettings');
        
        if (!settingsJson) {
          console.log('No app settings found in localStorage');
          return { success: true, message: 'No app settings to migrate' };
        }
  
        const settings = JSON.parse(settingsJson);
        const result = await this.dataManager.saveAppSettings(settings);
        
        if (result.success) {
          // Create backup
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupKey = `appSettings_backup_${timestamp}`;
          localStorage.setItem(backupKey, settingsJson);
          
          console.log('App settings migrated successfully');
          return { success: true, message: 'App settings migrated successfully' };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('Error migrating app settings:', error);
        return { success: false, error: error.message };
      }
    }
  
    // Full migration process
    async migrateAllData() {
      console.log('Starting data migration from localStorage to filesystem...');
      
      const results = {
        notebooks: null,
        pages: null,
        settings: null,
        overall: { success: false, errors: [] }
      };
  
      // Migrate notebooks
      console.log('1. Migrating notebooks...');
      results.notebooks = await this.migrateNotebooksFromLocalStorage();
      if (!results.notebooks.success) {
        results.overall.errors.push(`Notebooks: ${results.notebooks.error}`);
      }
  
      // Migrate app settings
      console.log('2. Migrating app settings...');
      results.settings = await this.migrateAppSettings();
      if (!results.settings.success) {
        results.overall.errors.push(`Settings: ${results.settings.error}`);
      }
  
      // Check overall success
      results.overall.success = results.overall.errors.length === 0;
      
      if (results.overall.success) {
        console.log('✅ Data migration completed successfully!');
      } else {
        console.log('⚠️ Data migration completed with errors:', results.overall.errors);
      }
  
      return results;
    }
  
    // Clean up localStorage after successful migration
    async cleanUpLocalStorage() {
      try {
        // List of keys to remove
        const keysToRemove = ['notebooks', 'appSettings'];
        
        // Find and remove page-specific keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('notebook_') && key.endsWith('_pages')) {
            keysToRemove.push(key);
          }
        }
  
        // Remove the keys
        keysToRemove.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`Removed localStorage key: ${key}`);
          }
        });
  
        return { success: true, message: `Cleaned up ${keysToRemove.length} localStorage keys` };
      } catch (error) {
        console.error('Error cleaning up localStorage:', error);
        return { success: false, error: error.message };
      }
    }
  
    // Verify migration integrity
    async verifyMigration() {
      try {
        console.log('Verifying migration integrity...');
        
        // Get data from both sources
        const localStorageNotebooks = JSON.parse(localStorage.getItem('notebooks') || '[]');
        const filesystemResult = await this.dataManager.loadAllNotebooks();
        
        if (!filesystemResult.success) {
          return { success: false, error: 'Failed to load notebooks from filesystem' };
        }
  
        const filesystemNotebooks = filesystemResult.notebooks;
        
        // Compare counts
        const localCount = localStorageNotebooks.length;
        const fsCount = filesystemNotebooks.length;
        
        console.log(`LocalStorage: ${localCount} notebooks, Filesystem: ${fsCount} notebooks`);
        
        if (localCount !== fsCount) {
          return {
            success: false,
            error: `Notebook count mismatch: LocalStorage has ${localCount}, Filesystem has ${fsCount}`
          };
        }
  
        // Verify each notebook exists
        const verification = {
          matched: 0,
          missing: [],
          errors: []
        };
  
        for (const lsNotebook of localStorageNotebooks) {
          const fsNotebook = filesystemNotebooks.find(nb => nb.id === lsNotebook.id);
          if (fsNotebook) {
            verification.matched++;
            // Verify basic properties
            if (fsNotebook.title !== lsNotebook.title) {
              verification.errors.push(`Title mismatch for notebook ${lsNotebook.id}`);
            }
          } else {
            verification.missing.push(lsNotebook.id);
          }
        }
  
        const isValid = verification.missing.length === 0 && verification.errors.length === 0;
        
        return {
          success: isValid,
          verification,
          message: isValid 
            ? 'Migration verification successful' 
            : `Verification found issues: ${verification.missing.length} missing, ${verification.errors.length} errors`
        };
      } catch (error) {
        console.error('Error verifying migration:', error);
        return { success: false, error: error.message };
      }
    }
  }
  
  // Example usage function
  export async function performDataMigration(dataManager) {
    const migration = new DataMigration(dataManager);
    
    try {
      // Perform migration
      const results = await migration.migrateAllData();
      
      if (results.overall.success) {
        // Verify migration
        const verification = await migration.verifyMigration();
        
        if (verification.success) {
          console.log('🎉 Migration completed and verified successfully!');
          
          // Optionally clean up localStorage
          const userConfirmed = confirm(
            'Migration successful! Would you like to clean up the old localStorage data? ' +
            '(Backups will be kept with timestamp)'
          );
          
          if (userConfirmed) {
            await migration.cleanUpLocalStorage();
            console.log('✅ LocalStorage cleanup completed');
          }
        } else {
          console.warn('⚠️ Migration verification failed:', verification.message);
        }
      } else {
        console.error('❌ Migration failed:', results.overall.errors);
      }
      
      return results;
    } catch (error) {
      console.error('Fatal error during migration:', error);
      return { success: false, error: error.message };
    }
  }