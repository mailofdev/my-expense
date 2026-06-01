import { APP_NAME, APP_TAGLINE, LOGO_PATH } from '../../core/constants/brand';

export default function BrandLogo({ size = 'md', showTagline = true, className = '' }) {
  return (
    <div className={`brand-logo brand-logo--${size} ${className}`.trim()}>
      <img
        src={LOGO_PATH}
        alt={`${APP_NAME} logo`}
        className="brand-logo__img"
      />
      {/* {showTagline && (
        <div className="brand-logo__text">
          <span className="brand-logo__name">{APP_NAME}</span>
          <span className="brand-logo__tagline">{APP_TAGLINE}</span>
        </div>
      )} */}
    </div>
  );
}
