import { Link } from 'react-router-dom';
import { useActiveItem } from '../state/PlaylistsContext';

export function TopBar() {
  const activeItem = useActiveItem();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <Link
          to="/playlists"
          className="flex items-baseline gap-1 font-hand text-3xl font-bold leading-none"
        >
          YouTube <span className="sketch-underline text-accent">Loop</span>
        </Link>

        <div className="hidden min-w-0 flex-1 sm:flex sm:flex-col sm:items-end">
          {activeItem ? (
            <div className="truncate font-hand text-base font-bold leading-tight text-ink">
              {activeItem.title}
            </div>
          ) : (
            <div className="truncate font-hand text-base text-ink-soft">
              Nothing playing yet — pick a video below.
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
