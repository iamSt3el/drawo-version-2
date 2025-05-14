import React, { useState, useEffect } from 'react'
import styles from './Header.module.scss'
import { SearchBar } from '../../molecules'
import { BadgePlus } from 'lucide-react'
import { Button } from '../../atoms'
import NotebookForm from '../NoteBookForm/NoteBookForm'

const Header = () => {
  const [showForm, setShowForm] = useState(false);

  const handleCreateNotebook = () => {
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  // Close modal when clicking on overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseForm();
    }
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

        <div className={styles.header_button}>
          <Button Icon={BadgePlus} label={"New Notebook"} onClick={handleCreateNotebook} />
        </div>
      </div>

      {/* Conditionally render the form */}
      {showForm && (
        <div className={styles.formOverlay} onClick={handleOverlayClick}>
          <div className={styles.formContainer}>
            <NotebookForm onClose={handleCloseForm} />
          </div>
        </div>
      )}
    </>
  )
}

export default Header