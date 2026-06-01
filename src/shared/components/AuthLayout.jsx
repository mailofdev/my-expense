import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-layout">
      <BrandLogo size="md" className="auth-layout__brand" />
      <div className="auth-layout__card">
        <header className="auth-layout__header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
      </div>
      <footer className="auth-layout__footer">
        <Link to="/login">Login</Link>
        <span>·</span>
        <Link to="/signup">Sign up</Link>
      </footer>
    </div>
  );
}
