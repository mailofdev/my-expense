import BrandLogo from './BrandLogo';

export default function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div
      className="flex min-h-screen min-h-dvh flex-col items-center justify-center gap-5 p-6 text-muted"
      role="status"
      aria-live="polite"
    >
      <BrandLogo size="md" />
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-edge border-t-primary" />
      <p>{message}</p>
    </div>
  );
}
