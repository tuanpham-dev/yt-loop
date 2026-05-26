interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-sketch border-[3px] border-dashed border-ink bg-paper-50 px-6 py-12 text-center">
      <div className="font-hand text-2xl font-bold text-ink">{title}</div>
      {description ? (
        <div className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
