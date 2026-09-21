export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Remove',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-black/70 backdrop-blur-sm"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-sm overflow-hidden rounded-lg border border-edge bg-surface p-6 shadow-card"
      >
        <h2 id="confirm-title" className="m-0 text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {message && (
          <p id="confirm-message" className="mb-0 mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {message}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button type="button" className="btn-outline min-w-0 flex-1" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`min-w-0 flex-1 ${
              danger
                ? 'btn border-0 bg-danger text-white hover:bg-danger/90'
                : 'btn-primary'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
