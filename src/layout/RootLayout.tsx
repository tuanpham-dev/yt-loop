import { useCallback, useRef } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { YouTubePlayer, type PlayerHandle } from '../player/YouTubePlayer';
import { PlayerBar } from '../player/PlayerBar';
import { RangeSlider } from '../player/RangeSlider';
import { usePlaybackController } from '../player/usePlaybackController';
import { ErrorBanner } from '../ui/ErrorBanner';
import { useActiveItem, useDispatch, usePlaylists } from '../state/PlaylistsContext';

export function RootLayout() {
  const playerRef = useRef<PlayerHandle>(null);
  const controls = usePlaybackController(playerRef);
  const activeItem = useActiveItem();
  const dispatch = useDispatch();
  const { activePlaylistId } = usePlaylists();

  const onChangeStart = useCallback(
    (sec: number) => {
      if (!activeItem || !activePlaylistId) return;
      dispatch({
        type: 'UPDATE_ITEM',
        playlistId: activePlaylistId,
        itemId: activeItem.id,
        patch: { startSec: sec },
      });
    },
    [dispatch, activeItem, activePlaylistId],
  );

  const onChangeEnd = useCallback(
    (sec: number) => {
      if (!activeItem || !activePlaylistId) return;
      dispatch({
        type: 'UPDATE_ITEM',
        playlistId: activePlaylistId,
        itemId: activeItem.id,
        patch: { endSec: sec },
      });
    },
    [dispatch, activeItem, activePlaylistId],
  );

  const onCommitStart = useCallback((sec: number) => {
    playerRef.current?.seekTo(sec);
  }, []);

  return (
    <div className="flex min-h-full flex-col text-ink">
      <header className="border-b-2 border-ink bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/playlists" className="flex items-baseline gap-1 font-hand text-3xl font-bold leading-none">
            YouTube <span className="sketch-underline text-accent">Loop</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <NavLink
              to="/playlists"
              className={({ isActive }) =>
                `rounded-sketch-sm border-2 px-3 py-1 font-hand text-base transition-all ${
                  isActive
                    ? 'border-ink bg-sticky-yellow shadow-sketch-press'
                    : 'border-transparent text-ink-soft hover:text-ink'
                }`
              }
            >
              Playlists
            </NavLink>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        <div className={activeItem ? 'block' : 'sr-only'} aria-hidden={!activeItem}>
          <div className="rounded-sketch border-[3px] border-ink bg-ink shadow-sketch overflow-hidden">
            <YouTubePlayer ref={playerRef} {...controls.playerHandlers} />
          </div>
        </div>
        {activeItem ? (
          <div className="mt-4">
            <RangeSlider
              startSec={activeItem.startSec}
              endSec={activeItem.endSec}
              duration={controls.duration}
              currentTime={controls.currentTime}
              onChangeStart={onChangeStart}
              onChangeEnd={onChangeEnd}
              onCommitStart={onCommitStart}
            />
          </div>
        ) : null}
        {controls.error ? (
          <div className="mt-3">
            <ErrorBanner message={controls.error} onDismiss={controls.clearError} />
          </div>
        ) : null}
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <PlayerBar controls={controls} />
    </div>
  );
}
