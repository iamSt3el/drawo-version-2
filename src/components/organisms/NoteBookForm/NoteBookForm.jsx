import React, { useState, useRef, useEffect } from 'react';
import styles from './NoteBookForm.module.scss';
import { X } from 'lucide-react';

const NotebookForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#8b5cf6',
    pages: 100,
    isCustomColor: false
  });

  const formRef = useRef(null);

  const presetColors = [
    { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)' },
    { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)' },
    { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)' },
    { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' },
    { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' },
    { color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)' },
    { color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)' },
    { color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)' }
  ];

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorSelect = (color) => {
    setFormData(prev => ({
      ...prev,
      color,
      isCustomColor: false
    }));
  };

  const handleCustomColor = (e) => {
    setFormData(prev => ({
      ...prev,
      color: e.target.value,
      isCustomColor: true
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const notebookData = {
      ...formData,
      date: new Date().toLocaleDateString('en-GB')
    };

    console.log('Notebook created:', notebookData);
    alert('Notebook created successfully!');
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={styles.notebookFormContainer} ref={formRef}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Create New Notebook</h2>
        <button 
          type="button"
          className={styles.closeButton} 
          onClick={onClose} 
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.notebookForm}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="title">
              Notebook Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.formInput}
              placeholder="e.g., Data Structures & Algorithms"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="pages">
              Pages
            </label>
            <div className={styles.rangeContainer}>
              <input
                type="range"
                id="pages"
                name="pages"
                value={formData.pages}
                onChange={handleInputChange}
                className={styles.rangeInput}
                min="50"
                max="500"
                step="10"
              />
              <span className={styles.pagesValue}>{formData.pages}</span>
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={styles.formTextarea}
            placeholder="Describe what this notebook is about..."
            required
          />
        </div>

        <div className={styles.colorSection}>
          <div className={styles.colorSectionTitle}>Choose Color Theme</div>
          
          <div className={styles.colorGrid}>
            {presetColors.map((colorItem, index) => (
              <div
                key={index}
                className={`${styles.colorOption} ${
                  formData.color === colorItem.color && !formData.isCustomColor 
                    ? styles.selected 
                    : ''
                }`}
                style={{ background: colorItem.gradient }}
                onClick={() => handleColorSelect(colorItem.color)}
              />
            ))}
          </div>
          
          <div className={styles.customColorRow}>
            <div className={styles.customColorPicker}>
              <input
                type="color"
                value={formData.color}
                onChange={handleCustomColor}
                className={styles.colorInput}
              />
            </div>
            <span className={styles.customColorLabel}>
              Or choose a custom color
            </span>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn}>
            Create Notebook
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotebookForm;