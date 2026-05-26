interface ErrorBannerProps {
  message: string;
  onDismiss?(): void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-sketch-sm border-2 border-ink bg-accent/15 px-3 py-2 text-sm text-ink shadow-sketch-press">
      <span className="flex-1 font-medium">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-ink/70 hover:text-ink"
          aria-label="Dismiss"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
