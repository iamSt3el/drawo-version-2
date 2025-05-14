import React from 'react'
import styles from './NoteBookInteriorPage.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import { useNotebooks } from '../../context/NotebookContext'

const NoteBookInteriorPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getNotebook } = useNotebooks();
    
    const notebook = getNotebook(id);

    const handleClick = () => {
        navigate('/notebook-manager');
    }

    if (!notebook) {
        return (
            <div className={styles.notebook_interior}>
                <h1>Notebook not found</h1>
                <button onClick={handleClick}>
                    Go back to notebooks
                </button>
            </div>
        );
    }

    return (
        <div className={styles.notebook_interior}>
            <h1>{notebook.title}</h1>
            <p>{notebook.description}</p>
            <p>Color: {notebook.color}</p>
            <p>Pages: {notebook.pages}</p>
            <p>Created: {notebook.date}</p>

            <button onClick={handleClick}>
                Back to Notebook Manager
            </button>
        </div>
    )
}

export default NoteBookInteriorPage