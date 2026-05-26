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
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-sketch-sm border-[3px] border-ink px-3 py-2 shadow-sketch-sm transition-all ${
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
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-12 w-20 flex-shrink-0 rounded border-2 border-ink object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-hand text-lg font-bold text-ink">
              {item.title}
            </span>
            {isActive ? (
              <span className="rounded-sketch-sm border-2 border-ink bg-accent px-2 py-0.5 font-hand text-xs uppercase tracking-wide text-paper">
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
          className="rounded px-2 py-1 font-hand text-sm text-ink hover:bg-paper-100"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-2 py-1 font-hand text-sm text-accent-dark hover:bg-accent/10"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
