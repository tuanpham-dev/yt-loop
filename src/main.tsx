import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PlaylistsProvider } from './state/PlaylistsContext';
import { App } from './App';
import './index.css';

// Served from a subpath on GitHub Pages (e.g. /yt-loop/), from "/" elsewhere.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <PlaylistsProvider>
        <App />
      </PlaylistsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
