import React from 'react'
import styles from './NoteBookInteriorPage.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import { useNotebooks } from '../../context/NotebookContext'
import { NoteBookUi, ToolBar } from '../../components/molecules'

const NoteBookInteriorPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getNotebook } = useNotebooks();

    const notebook = getNotebook(id);

    const handleClick = () => {
        navigate('/notebook-manager');
    }

    return (
        <div className={styles.notebook_interior}>
            <div className={styles.notebook_interior_toolbar}><ToolBar /></div>
            <div className={styles.notebook_interior_ui}>
                <NoteBookUi/>
            </div>
        </div>
    )
}

export default NoteBookInteriorPage