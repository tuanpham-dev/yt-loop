import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDispatch, usePlaylists } from '../state/PlaylistsContext';
import type { PlaylistItem } from '../types';
import {
  fetchVideoTitle,
  formatTime,
  getThumbnailUrl,
  parseTimeInput,
  parseYouTubeId,
} from '../lib/youtube';
import { newId } from '../lib/id';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Spinner } from '../ui/Spinner';
import { SortableItemRow } from './SortableItemRow';

export function PlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const state = usePlaylists();
  const dispatch = useDispatch();
  const playlist = state.playlists.find((p) => p.id === playlistId);

  useEffect(() => {
    if (playlist && state.activePlaylistId !== playlist.id) {
      dispatch({ type: 'SELECT_PLAYLIST', playlistId: playlist.id });
    }
  }, [playlist, state.activePlaylistId, dispatch]);

  const [urlInput, setUrlInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PlaylistItem | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<PlaylistItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemIds = useMemo(() => playlist?.items.map((i) => i.id) ?? [], [playlist]);

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="font-hand text-2xl text-ink">Playlist not found.</p>
        <Link to="/playlists" className="mt-3 font-hand text-base text-accent hover:underline">
          ← Back to playlists
        </Link>
      </div>
    );
  }

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const videoId = parseYouTubeId(urlInput);
    if (!videoId) {
      setAddError('That does not look like a valid YouTube URL or ID.');
      return;
    }
    setAdding(true);
    const fetchedTitle = await fetchVideoTitle(videoId);
    const item: PlaylistItem = {
      id: newId(),
      videoId,
      title: fetchedTitle || videoId,
      thumbnailUrl: getThumbnailUrl(videoId),
      startSec: 0,
      endSec: 0,
      volume: 80,
    };
    dispatch({ type: 'ADD_ITEM', playlistId: playlist.id, item });
    setUrlInput('');
    setAdding(false);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = playlist.items.findIndex((i) => i.id === active.id);
    const to = playlist.items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    dispatch({ type: 'REORDER_ITEM', playlistId: playlist.id, fromIndex: from, toIndex: to });
  };

  const selectItem = (index: number) => {
    dispatch({ type: 'SELECT_ITEM', playlistId: playlist.id, index });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/playlists" className="font-hand text-base text-accent hover:underline">
          ← Playlists
        </Link>
        <h1 className="flex-1 truncate font-hand text-3xl font-bold text-ink">
          {playlist.name}
        </h1>
      </div>

      <form onSubmit={onAdd} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="YouTube URL or 11-character video ID"
            aria-label="YouTube URL or video ID"
            disabled={adding}
          />
          <Button type="submit" variant="primary" disabled={adding || !urlInput.trim()}>
            {adding ? <Spinner /> : 'Add'}
          </Button>
        </div>
        {addError ? <ErrorBanner message={addError} onDismiss={() => setAddError(null)} /> : null}
      </form>

      {playlist.items.length === 0 ? (
        <EmptyState
          title="No videos yet 🎬"
          description="Paste a YouTube URL above to drop in your first track."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {playlist.items.map((item, index) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  isActive={index === playlist.activeItemIndex}
                  isPlaying={state.isPlaying && index === playlist.activeItemIndex}
                  onSelect={() => selectItem(index)}
                  onEdit={() => setEditing(item)}
                  onRemove={() => setConfirmRemove(item)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <EditItemModal
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (!editing) return;
          dispatch({
            type: 'UPDATE_ITEM',
            playlistId: playlist.id,
            itemId: editing.id,
            patch,
          });
          setEditing(null);
        }}
      />

      <Modal
        open={!!confirmRemove}
        title="Remove video"
        onClose={() => setConfirmRemove(null)}
      >
        {confirmRemove ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Remove <span className="font-bold">{confirmRemove.title}</span> from this playlist?
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirmRemove(null)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  dispatch({
                    type: 'REMOVE_ITEM',
                    playlistId: playlist.id,
                    itemId: confirmRemove.id,
                  });
                  setConfirmRemove(null);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

interface EditItemModalProps {
  item: PlaylistItem | null;
  onClose(): void;
  onSave(patch: Partial<Omit<PlaylistItem, 'id'>>): void;
}

function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [title, setTitle] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [volume, setVolume] = useState(80);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setStartInput(formatTime(item.startSec));
    setEndInput(item.endSec > 0 ? formatTime(item.endSec) : '');
    setVolume(item.volume);
    setError(null);
  }, [item]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const startSec = parseTimeInput(startInput);
    const endSec = endInput.trim() ? parseTimeInput(endInput) : 0;
    if (startSec === null || startSec < 0) {
      setError('Start time must be a number or m:ss format.');
      return;
    }
    if (endSec === null || endSec < 0) {
      setError('End time must be a number or m:ss format (or empty).');
      return;
    }
    if (endSec > 0 && endSec <= startSec) {
      setError('End time must be greater than start time.');
      return;
    }
    onSave({
      title: title.trim() || (item?.title ?? ''),
      startSec,
      endSec,
      volume,
    });
  };

  return (
    <Modal open={!!item} title="Edit video" onClose={onClose}>
      {item ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 font-hand text-sm text-ink-soft">
            Title
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 font-hand text-sm text-ink-soft">
              Start (s or m:ss)
              <Input
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1 font-hand text-sm text-ink-soft">
              End (s or m:ss, empty = full)
              <Input
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                placeholder="e.g. 1:30"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 font-hand text-sm text-ink-soft">
            Volume ({volume})
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              className="accent-accent"
            />
          </label>
          {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
