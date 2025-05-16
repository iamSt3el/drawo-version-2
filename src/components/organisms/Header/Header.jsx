// components/organisms/Header/Header.jsx - Updated with data directory settings
import React, { useState, useEffect } from 'react'
import styles from './Header.module.scss'
import { SearchBar } from '../../molecules'
import { BadgePlus, FolderOpen } from 'lucide-react'
import { Button } from '../../atoms'
import NotebookForm from '../NoteBookForm/NoteBookForm'
import DataDirectorySettings from '../DataDirectorySettings/DataDirectorySettings'

const Header = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);

  const handleCreateNotebook = () => {
    // Clear any potential event listeners by forcing a reflow
    setTimeout(() => {
      setShowForm(true);
    }, 0);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    
    // Clear focus and force reflow after closing
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      // Force garbage collection of any remaining event listeners
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  const handleDataSettings = () => {
    setShowDataSettings(true);
  };

  const handleCloseDataSettings = () => {
    setShowDataSettings(false);
  };

  return (
    <>
      <div className={styles.header_cover}>
        <div className={styles.header_title}>
          <h1>Drawo</h1>
        </div>

        <div className={styles.header_searchBar}>
          <SearchBar />
        </div>

        <div className={styles.header_actions}>
          <Button 
            Icon={FolderOpen} 
            label={"Data Directory"} 
            onClick={handleDataSettings}
          />
          <Button 
            Icon={BadgePlus} 
            label={"New Notebook"} 
            onClick={handleCreateNotebook} 
          />
        </div>
      </div>

      {/* Use timestamp as key to ensure completely fresh component */}
      {showForm && (
        <NotebookForm 
          key={`form-${Date.now()}`} 
          onClose={handleCloseForm} 
        />
      )}

      {/* Data Directory Settings Modal */}
      {showDataSettings && (
        <DataDirectorySettings 
          onClose={handleCloseDataSettings} 
        />
      )}
    </>
  )
}

export default Header