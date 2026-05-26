import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="font-hand text-7xl font-bold text-ink">404</div>
      <div className="mt-2 font-hand text-xl text-ink-soft">
        Hmm, that page wandered off the page.
      </div>
      <Link
        to="/playlists"
        className="mt-6 font-hand text-base text-accent hover:underline"
      >
        ← Back to playlists
      </Link>
    </div>
  );
}
