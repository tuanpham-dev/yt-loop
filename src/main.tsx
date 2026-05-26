import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PlaylistsProvider } from './state/PlaylistsContext';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlaylistsProvider>
        <App />
      </PlaylistsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
