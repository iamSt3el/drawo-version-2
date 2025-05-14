import React from 'react'
import styles from './NoteBookCard.module.scss'

const NoteBookCard = () => {
  const numberOfHoles = 19;
  return (
    <div className={styles.notebook_card}>
      <div className={styles.notebook_card_cover}>
        <div className={styles.notebook_card_hole_div}>
          {Array.from({ length: numberOfHoles }).map((_, index) => (
            <div key={index} className={styles.notebook_card_holes}>
              <div className={styles.checkmark}></div>
            </div>
          ))}

        </div>

        <div className={styles.notebook_card_content}>
          <div className={styles.notebook_card_date}>
            <h4>14/05/2025</h4>
          </div>

          <div className={styles.notebook_card_title}>
            <h2>What is DSA</h2>
          </div>

          <div className={styles.notebook_card_description}>
            <p>This notebook container notes about dsa. Like Array, linked list and trees.</p>
          </div>

          <div className={styles.notebook_card_progress_content}>
            <div className={styles.page_number}>
              <h4>Page: 100</h4>
            </div>

            <div className={styles.progress}>
              <h4>80%</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteBookCard
