import React from 'react'
import styles from './NoteBookManagePage.module.scss'
import { useNavigate } from 'react-router-dom'
import { NoteBookCard } from '../../components/molecules';
import { Header } from '../../components/organisms';

const NoteBookManagerPage = () => {
  const navigate = useNavigate();
  const numberOfCards = 6; // Change this number as needed
  
  const handleClick = () => {
    navigate('/notebook-interior');
  }
  
  return (
    <div className={styles.notebook_manager}>
      <div className={styles.notebook_manager_header}>
        <Header/>
      </div>
      <div className={styles.notebook_grid}>
        {Array.from({ length: numberOfCards }).map((_, index) => (
          <NoteBookCard key={index} />
        ))}
      </div>
      <button onClick={handleClick}>
        Click me
      </button>
    </div>
  )
}

export default NoteBookManagerPage