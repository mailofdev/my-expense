import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div
      className="flex min-h-screen min-h-dvh flex-col items-center justify-center px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232, 197, 71, 0.22), transparent), #0a0f0d',
      }}
    >
      <BrandLogo size="lg" className="mb-6" />
      <div className="card w-full max-w-md shadow-card">
        <header className="mb-6">
          <h2 className="m-0 text-xl font-bold sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        </header>
        {children}
      </div>
      <footer className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
        <Link to="/login">Login</Link>
        <span className="hidden sm:inline">·</span>
        <Link to="/signup">Sign up</Link>
      </footer>
    </div>
  );
}
