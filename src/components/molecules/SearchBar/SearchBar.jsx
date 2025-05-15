// SearchBar.js
import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import styles from './SearchBar.module.scss';
import { useNotebooks } from '../../../context/NotebookContextWithFS';

const SearchBar = ({ placeholder = "Search your notebooks..." }) => {
  const { searchQuery, updateSearchQuery } = useNotebooks();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Sync local state with context
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalQuery(value);
    updateSearchQuery(value);
  };

  const clearSearch = () => {
    setLocalQuery('');
    updateSearchQuery('');
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} />
        
        <input
          type="text"
          value={localQuery}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className={styles.searchInput}
        />
        
        {localQuery && (
          <button
            onClick={clearSearch}
            className={styles.clearButton}
          >
            <X className={styles.clearIcon} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;