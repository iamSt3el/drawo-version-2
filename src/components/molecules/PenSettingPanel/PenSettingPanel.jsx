import React, { useState } from 'react'
import styles from './PenSettingPanel.module.scss'

const PenSettingPanel = ({ onColorChange, onStrokeWidthChange, size, color , setColor, setSize}) => {
    const colors = [
        '#000000', // Black
        '#dc2626', // Red
        '#2563eb', // Blue
        '#16a34a', // Green
        '#ca8a04', // Yellow
        '#7c3aed', // Purple
        '#ea580c', // Orange
        '#0891b2', // Cyan
    ];

    const [currentColor, setCurrentColor] = useState(color);
    const [currentSize, setCurrentSize] = useState(size);
    const handleColorClick = (color) => {
        setCurrentColor(color);
        setColor(color);
        if (onColorChange) {
            onColorChange(color);
        }
    };

    const handleStrokeWidthChange = (width) => {
        onStrokeWidthChange(width);
        setSize(width);
        setCurrentSize(width);
    }
    return (
        <div className={styles.pensettingpanel}>
            <div className={styles.pensettingpanel_cover}>
                <div className={styles.color_picker_cover}>
                    <div className={styles.color_picker}>
                        <div className={styles.color_grid}>
                            {colors.map((color) => (
                                <div
                                    key={color}
                                    className={`${styles.color_option} ${currentColor === color ? styles.active : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorClick(color)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className={styles.opacity_cover}>
                    <div className={styles.opacity_label}>Opacity</div>
                    <input type="range" min="0" max="100" defaultValue="100" className={styles.opacity_slider} />
                </div>
                <div className={styles.size_cover}>
                    <button className={`${styles.size_button} ${currentSize === 2 ? styles.active : ''}`} onClick={() => handleStrokeWidthChange(2)}>S</button>
                    <button className={`${styles.size_button} ${currentSize === 5 ? styles.active : ''}`} onClick={() => handleStrokeWidthChange(5)}>M</button>
                    <button className={`${styles.size_button} ${currentSize === 8 ? styles.active : ''}`} onClick={() => handleStrokeWidthChange(8)}>L</button>
                    <button className={`${styles.size_button} ${currentSize === 10 ? styles.active : ''}`} onClick={() => handleStrokeWidthChange(10)}>XL</button>
                </div>
            </div>
        </div>
    )
}

export default PenSettingPanel
