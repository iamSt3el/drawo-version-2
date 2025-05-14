// SearchBar.js
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import styles from './SearchBar.module.scss';

const SearchBar = ({ onSearch, placeholder = "Search your notebooks..." }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch && onSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch && onSearch('');
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} />
        
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className={styles.searchInput}
        />
        
        {searchQuery && (
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