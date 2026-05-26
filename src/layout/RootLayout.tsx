import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { YouTubePlayer, type PlayerHandle } from '../player/YouTubePlayer';
import { RangeSlider } from '../player/RangeSlider';
import { usePlaybackController } from '../player/usePlaybackController';
import { ErrorBanner } from '../ui/ErrorBanner';
import { useActiveItem, useDispatch, usePlaylists } from '../state/PlaylistsContext';
import { TopBar } from './TopBar';

export function RootLayout() {
  const playerRef = useRef<PlayerHandle>(null);
  const controls = usePlaybackController(playerRef);
  const activeItem = useActiveItem();
  const dispatch = useDispatch();
  const { activePlaylistId, isPlaying } = usePlaylists();

  const [isPip, setIsPip] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  // Prevents the observer from re-activating PiP while scrolling back to the player.
  const pipLockedRef = useRef(false);
  const activeItemRef = useRef(activeItem);
  useEffect(() => { activeItemRef.current = activeItem; }, [activeItem]);

  useEffect(() => {
    const el = playerContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (window.innerWidth < 768 || !activeItemRef.current) return;
        if (!entry.isIntersecting && !pipLockedRef.current) {
          setIsPip(true);
        } else if (entry.isIntersecting) {
          pipLockedRef.current = false;
          setIsPip(false);
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    const onResize = () => { if (window.innerWidth < 768) setIsPip(false); };
    window.addEventListener('resize', onResize);
    return () => { observer.disconnect(); window.removeEventListener('resize', onResize); };
  }, []);

  useEffect(() => { if (!activeItem) setIsPip(false); }, [activeItem]);

  const expandPip = () => {
    pipLockedRef.current = true;
    setIsPip(false);
    playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      <TopBar controls={controls} />

      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        <div
          ref={playerContainerRef}
          className={activeItem ? 'block' : 'sr-only'}
          aria-hidden={!activeItem}
        >
          {/* Spacer: preserves layout height while player is fixed in PiP */}
          {isPip && <div className="aspect-video w-full" aria-hidden />}

          <div
            className={
              isPip
                ? 'fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-sketch border-[3px] border-ink bg-ink shadow-[6px_6px_0_0_rgba(45,45,45,0.45)]'
                : 'overflow-hidden rounded-sketch border-[3px] border-ink bg-ink shadow-sketch'
            }
          >
            <YouTubePlayer ref={playerRef} {...controls.playerHandlers} />

            {isPip && activeItem && (
              <div className="flex items-center gap-1.5 bg-paper px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate font-hand text-xs font-bold text-ink">
                  {activeItem.title}
                </span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'PREV' })}
                  aria-label="Previous"
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-hand text-sm leading-none hover:bg-sticky-yellow"
                >
                  {'<'}
                </button>
                <button
                  type="button"
                  onClick={controls.togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="rounded border-2 border-ink bg-accent px-2 py-0.5 font-hand text-sm font-bold leading-none text-paper hover:opacity-90"
                >
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'NEXT' })}
                  aria-label="Next"
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-hand text-sm leading-none hover:bg-sticky-yellow"
                >
                  {'>'}
                </button>
                <button
                  type="button"
                  onClick={expandPip}
                  aria-label="Expand player"
                  title="Back to player"
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-hand text-sm leading-none hover:bg-sticky-green"
                >
                  ↗
                </button>
              </div>
            )}
          </div>
        </div>

        {activeItem && !isPip ? (
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
    </div>
  );
}
