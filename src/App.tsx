import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './layout/RootLayout';
import { PlaylistsPage } from './routes/PlaylistsPage';
import { PlaylistDetailPage } from './routes/PlaylistDetailPage';
import { NotFoundPage } from './routes/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Navigate to="/playlists" replace />} />
        <Route path="/playlists" element={<PlaylistsPage />} />
        <Route path="/playlists/:playlistId" element={<PlaylistDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
