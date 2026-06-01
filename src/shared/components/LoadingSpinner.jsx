import BrandLogo from './BrandLogo';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div
      className="flex min-h-screen min-h-dvh flex-col items-center justify-center gap-5 bg-bg p-6 text-muted"
      role="status"
      aria-live="polite"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232, 197, 71, 0.22), transparent), #0a0f0d',
      }}
    >
      <BrandLogo size="md" />
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-edge border-t-primary" />
      <p>{message}</p>
    </div>
  );
}
