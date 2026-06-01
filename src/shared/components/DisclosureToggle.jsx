export default function DisclosureToggle({
  open,
  onToggle,
  title,
  hintOpen = 'Tap to hide',
  hintClosed,
  controlsId,
}) {
  return (
    <button
      type="button"
      className={`group flex w-full min-h-[44px] items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-left transition-all ${
        open
          ? 'border-primary/50 bg-primary/10 text-primary'
          : 'border-edge bg-surface-2/80 text-[#f0f4f2] hover:border-primary/35 hover:bg-surface-2'
      }`}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controlsId}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className={`text-xs ${open ? 'text-primary/70' : 'text-muted'}`}>
          {open ? hintOpen : hintClosed}
        </span>
      </span>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
          open ? 'border-primary/40 bg-primary/15' : 'border-edge bg-surface group-hover:border-primary/30'
        }`}
        aria-hidden="true"
      >
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? 'rotate-180 text-primary' : 'text-muted group-hover:text-primary'
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </button>
  );
}
