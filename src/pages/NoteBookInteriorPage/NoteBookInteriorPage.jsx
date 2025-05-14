import React from 'react'
import styles from './NoteBookInteriorPage.module.scss'
import { useNavigate } from 'react-router-dom'

const NoteBookInteriorPage = () => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/notebook-manager');
    }

    return (
        <div className={styles.notebook_interior}>
            <h1>NoteBook Interior page</h1>

            <button onClick = {handleClick}>
                click me to go back
            </button>
        </div>
    )
}

export default NoteBookInteriorPage
