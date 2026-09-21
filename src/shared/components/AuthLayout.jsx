import BrandLogo from './BrandLogo';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen min-h-dvh flex-col items-center justify-center overflow-hidden px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        aria-hidden="true"
      />
      <BrandLogo size="lg" wordmark className="relative mb-8" />
      <div className="card relative w-full max-w-sm">
        <header className="mb-6">
          <h2 className="m-0 text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
