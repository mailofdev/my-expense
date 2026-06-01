import BrandLogo from './BrandLogo';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <BrandLogo size="md" showTagline={false} />
      <div className="loading-spinner__ring" />
      <p>{message}</p>
    </div>
  );
}
