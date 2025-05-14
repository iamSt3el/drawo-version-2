import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { SplashPage } from './pages/SplashPage';
import { NoteBookManagerPage } from './pages/NoteBookManagerPage';
import { NoteBookInteriorPage } from './pages/NoteBookInteriorPage';

function App() {
  return (
    <Router initialEntries={['/']} initialIndex={0}>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/notebook-manager" element={<NoteBookManagerPage />} />
        <Route path="/notebook-interior" element={<NoteBookInteriorPage />} />
      </Routes>
    </Router>
  );
}
export default App;