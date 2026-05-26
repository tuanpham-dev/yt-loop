import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, usePlaylists } from '../state/PlaylistsContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';

const STICKY_TINTS = ['bg-sticky-yellow', 'bg-sticky-pink', 'bg-sticky-green', 'bg-sticky-blue'];

export function PlaylistsPage() {
  const { playlists } = usePlaylists();
  const dispatch = useDispatch();
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    dispatch({ type: 'CREATE_PLAYLIST', name });
    setNewName('');
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-hand text-4xl font-bold text-ink">
          Your <span className="sketch-underline">Playlists</span>
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Make playlists, loop your favorite parts, vibe forever.
        </p>
      </section>

      <form onSubmit={onCreate} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New playlist name…"
          aria-label="New playlist name"
        />
        <Button type="submit" variant="primary" disabled={!newName.trim()}>
          + Create
        </Button>
      </form>

      {playlists.length === 0 ? (
        <EmptyState
          title="Nothing here yet ✏️"
          description="Sketch out a new playlist above to get started."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p, i) => {
            const tint = STICKY_TINTS[i % STICKY_TINTS.length];
            return (
              <li
                key={p.id}
                className={`relative flex flex-col gap-3 rounded-sketch border-[3px] border-ink ${tint} p-4 shadow-sketch transition-transform hover:-rotate-1`}
              >
                <Link
                  to={`/playlists/${p.id}`}
                  onClick={() => dispatch({ type: 'SELECT_PLAYLIST', playlistId: p.id })}
                  className="block"
                >
                  <div className="font-hand text-2xl font-bold leading-tight text-ink">
                    {p.name}
                  </div>
                  <div className="mt-1 text-xs text-ink-soft">
                    {p.items.length} {p.items.length === 1 ? 'video' : 'videos'}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setRenaming({ id: p.id, name: p.name })}>
                    Rename
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setDeleting({ id: p.id, name: p.name })}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!renaming}
        title="Rename playlist"
        onClose={() => setRenaming(null)}
      >
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!renaming.name.trim()) return;
              dispatch({
                type: 'RENAME_PLAYLIST',
                playlistId: renaming.id,
                name: renaming.name.trim(),
              });
              setRenaming(null);
            }}
            className="flex flex-col gap-3"
          >
            <Input
              autoFocus
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              aria-label="Playlist name"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRenaming(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!renaming.name.trim()}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={!!deleting}
        title="Delete playlist"
        onClose={() => setDeleting(null)}
      >
        {deleting ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Delete <span className="font-bold">{deleting.name}</span>? This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeleting(null)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  dispatch({ type: 'DELETE_PLAYLIST', playlistId: deleting.id });
                  setDeleting(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
