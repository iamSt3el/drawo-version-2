import React from 'react'
import styles from './Header.module.scss'
import { SearchBar } from '../../molecules'
import { BadgePlus } from 'lucide-react'
import { Button } from '../../atoms'
import NotebookForm from '../NoteBookForm/NoteBookForm'


const Header = () => {
  return (
    <div className={styles.header_cover}>
      <div className={styles.header_title}>
        <h1>Drawo</h1>
      </div>

      <div className={styles.header_searchBar}>
        <SearchBar />
      </div>

      <div className={styles.header_button}>
        <Button Icon={BadgePlus} label={"New Notebook"} onClick={() => {
          <NotebookForm />
        }} />
      </div>
    </div>
  )
}

export default Header
