import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose(): void;
  children: React.ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-sketch border-[3px] border-ink bg-paper p-5 shadow-sketch-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-hand text-2xl font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-ink bg-paper px-2 leading-none text-ink hover:bg-sticky-yellow"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
