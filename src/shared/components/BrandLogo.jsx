import { APP_NAME, LOGO_PATH } from '../../core/constants/brand';

export default function BrandLogo({ size = 'md', className = '' }) {
  return (
    <div className={`brand-logo brand-logo--${size} ${className}`.trim()}>
      <img
        src={LOGO_PATH}
        alt={`${APP_NAME} logo`}
        className="brand-logo__img"
      />
    </div>
  );
}
