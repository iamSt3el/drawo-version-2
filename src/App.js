// src/App.js - Updated App component with filesystem integration
import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { NoteBookManagerPage } from './pages/NoteBookManagerPage';
import { NoteBookInteriorPage } from './pages/NoteBookInteriorPage';
import { NotebookProvider } from './context/NotebookContextWithFS'; // Updated import

function App() {
  return (
    <NotebookProvider>
      <Router initialEntries={['/']} initialIndex={0}>
        <Routes>
          <Route path="/" element={<NoteBookManagerPage />} />
          <Route path="/notebook-interior/:id" element={<NoteBookInteriorPage />} />
        </Routes>
      </Router>
    </NotebookProvider>
  );
}

export default App;