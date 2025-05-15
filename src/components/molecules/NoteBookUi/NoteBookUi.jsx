import React, { useState, useEffect } from 'react'
import styles from './NoteBookUi.module.scss'



const NoteBookUi = () => {
  const [numberOfHoles, setNumberOfHoles] = useState(25);

  useEffect(() => {
    const updateHoleCount = () => {
      const screenWidth = window.innerWidth;
      
      if (screenWidth <= 868) {
        setNumberOfHoles(24); // Fewer holes for smaller screens
      } else {
        setNumberOfHoles(27); // Default number for larger screens
      }
    };

    // Set initial hole count
    updateHoleCount();

    // Add event listener for window resize
    window.addEventListener('resize', updateHoleCount);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', updateHoleCount);
    };
  }, []);

  return (
    <div className={styles.notebookui_cover}>
      <div className={styles.notebookui_holes_div}>
        {Array.from({ length: numberOfHoles }).map((_, index) => (
          <div key={index} className={styles.notebookui_holes}>
          </div>
        ))}
      </div>

      <div className={styles.noteboolui_content}>
      </div>
    </div>
  )
}

export default NoteBookUi