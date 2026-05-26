import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlaylistItem } from '../types';
import { formatTime } from '../lib/youtube';

interface SortableItemRowProps {
  item: PlaylistItem;
  isActive: boolean;
  isPlaying: boolean;
  onSelect(): void;
  onEdit(): void;
  onRemove(): void;
}

export function SortableItemRow({
  item,
  isActive,
  isPlaying,
  onSelect,
  onEdit,
  onRemove,
}: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-sketch-sm border-[3px] border-ink px-3 py-2 shadow-sketch-sm ${
        isActive ? 'bg-sticky-yellow' : 'bg-paper hover:bg-paper-50'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab touch-none rounded border-2 border-ink bg-paper px-2 py-1 font-hand text-base leading-none text-ink-soft hover:bg-sticky-yellow hover:text-ink active:cursor-grabbing"
      >
        ⠿
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="relative flex-shrink-0">
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-12 w-20 rounded border-2 border-ink object-cover"
            loading="lazy"
          />
          {isActive ? (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-ink/55 font-hand text-[11px] font-bold uppercase tracking-wide text-paper sm:hidden"
              aria-hidden
            >
              {isPlaying ? '▶ Playing' : 'Active'}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-hand text-lg font-bold text-ink">
              {item.title}
            </span>
            {isActive ? (
              <span className="hidden rounded-sketch-sm border-2 border-ink bg-accent px-2 py-0.5 font-hand text-xs uppercase tracking-wide text-paper sm:inline">
                {isPlaying ? '▶ Playing' : 'Active'}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-soft">
            {formatTime(item.startSec)} → {formatTime(item.endSec)} · vol {item.volume}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper font-hand text-base leading-none text-ink shadow-sketch-press hover:bg-sticky-yellow sm:h-auto sm:w-auto sm:rounded sm:border-0 sm:bg-transparent sm:px-2 sm:py-1 sm:text-sm sm:shadow-none sm:hover:bg-paper-100"
        >
          <span aria-hidden className="sm:hidden">✎</span>
          <span className="hidden sm:inline">Edit</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper font-hand text-base leading-none text-accent-dark shadow-sketch-press hover:bg-accent/15 sm:h-auto sm:w-auto sm:rounded sm:border-0 sm:bg-transparent sm:px-2 sm:py-1 sm:text-sm sm:shadow-none sm:hover:bg-accent/10"
        >
          <span aria-hidden className="sm:hidden">×</span>
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>
    </li>
  );
}
