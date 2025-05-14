import React, { useState } from 'react';
import './NoteBookForm.scss';

const NotebookForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#8b5cf6',
    pages: 100,
    isCustomColor: false
  });

  const presetColors = [
    { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
    { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
    { color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)' },
    { color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
    { color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    { color: '#84cc16', gradient: 'linear-gradient(135deg, #84cc16, #65a30d)' }
  ];

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
    // Here you would typically send the data to your backend
    alert('Notebook created successfully!');
  };

  return (
    <div className="notebook-form-container">
      <div className="form-wrapper">
        <h2 className="form-title">Create New Notebook</h2>
        
        <form onSubmit={handleSubmit} className="notebook-form">
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Notebook Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-input"
              placeholder="What is DSA"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="This notebook contains notes about DSA. Like Array, linked list and trees."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Choose Color</label>
            <div className="color-selection">
              <div className="color-grid">
                {presetColors.map((colorItem, index) => (
                  <div
                    key={index}
                    className={`color-option ${
                      formData.color === colorItem.color && !formData.isCustomColor 
                        ? 'selected' 
                        : ''
                    }`}
                    style={{ background: colorItem.gradient }}
                    onClick={() => handleColorSelect(colorItem.color)}
                  />
                ))}
              </div>
              <div className="custom-color-section">
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    id="customColor"
                    value={formData.color}
                    onChange={handleCustomColor}
                    className="color-picker"
                  />
                </div>
                <span className="custom-color-label">Custom</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pages">
              Number of Pages
            </label>
            <div className="range-container">
              <input
                type="range"
                id="pages"
                name="pages"
                value={formData.pages}
                onChange={handleInputChange}
                className="range-input"
                min="50"
                max="500"
              />
              <span className="range-value">{formData.pages}</span>
            </div>
          </div>

          <button type="submit" className="submit-btn">
            Create Notebook
          </button>
        </form>
      </div>
    </div>
  );
};

export default NotebookForm;