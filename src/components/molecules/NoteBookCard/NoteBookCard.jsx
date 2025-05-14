import React from 'react'
import styles from './NoteBookCard.module.scss'
import { useNavigate } from 'react-router-dom'

const NoteBookCard = ({ notebook }) => {
  const navigate = useNavigate();
  const numberOfHoles = 19;

  // Default values in case notebook prop is not provided
  const {
    id = 1,
    title = "What is DSA",
    description = "This notebook contains notes about DSA. Like Array, linked list and trees.",
    date = "14/05/2025",
    pages = 100,
    currentPage = 0,
    progress = 0,
    gradient = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)"
  } = notebook || {};

  const handleCardClick = () => {
    navigate(`/notebook-interior/${id}`);
  };

  return (
    <div className={styles.notebook_card} onClick={handleCardClick}>
      <div className={styles.notebook_card_cover} style={{ background: gradient }}>
        <div className={styles.notebook_card_hole_div}>
          {Array.from({ length: numberOfHoles }).map((_, index) => (
            <div key={index} className={styles.notebook_card_holes}>
              <div className={styles.checkmark}></div>
            </div>
          ))}
        </div>

        <div className={styles.notebook_card_content}>
          <div className={styles.notebook_card_date}>
            <h4>{date}</h4>
          </div>

          <div className={styles.notebook_card_title}>
            <h2>{title}</h2>
          </div>

          <div className={styles.notebook_card_description}>
            <p>{description}</p>
          </div>

          <div className={styles.notebook_card_progress_content}>
            <div className={styles.page_number}>
              <h4>Page: {currentPage}/{pages}</h4>
            </div>

            <div className={styles.progress}>
              <h4>{Math.round(progress)}%</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteBookCard