// src/pages/NoteBookManagerPage/NoteBookManagerPage.jsx
import React from 'react'
import styles from './NoteBookManagePage.module.scss'
import { useNavigate } from 'react-router-dom'
import { NoteBookCard } from '../../components/molecules'; // Make sure this import path is correct
import { Header } from '../../components/organisms';
import { useNotebookStore } from '../../stores/notebookStore';

const NoteBookManagerPage = () => {
  const navigate = useNavigate();
  const { filteredNotebooks, searchQuery } = useNotebookStore();
  
  const handleClick = () => {
    navigate('/notebook-interior/1');
  }
  
  return (
    <div className={styles.notebook_manager}>
      <div className={styles.notebook_manager_header}>
        <Header />
      </div>
      
      <div className={styles.notebook_content}>
        {searchQuery && (
          <div className={styles.search_results}>
            <p>
              {filteredNotebooks.length === 0 
                ? `No notebooks found for "${searchQuery}"` 
                : `Found ${filteredNotebooks.length} notebook${filteredNotebooks.length === 1 ? '' : 's'} for "${searchQuery}"`
              }
            </p>
          </div>
        )}
        
        {filteredNotebooks.length === 0 && !searchQuery ? (
          <div className={styles.empty_state}>
            <h2>No notebooks yet</h2>
            <p>Create your first notebook to get started!</p>
          </div>
        ) : (
          <div className={styles.notebook_grid}>
            {filteredNotebooks.map((notebook) => (
              <NoteBookCard key={notebook.id} notebook={notebook} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NoteBookManagerPage