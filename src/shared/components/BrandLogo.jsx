import { APP_NAME, LOGO_PATH } from '../../core/constants/brand';

const sizes = {
  lg: 'h-[clamp(100px,28vw,160px)] w-[clamp(100px,28vw,160px)]',
  md: 'h-[88px] w-[88px]',
  sm: 'h-11 w-11',
};

export default function BrandLogo({ size = 'md', className = '', wordmark = false }) {
  const row = size === 'sm';

  return (
    <div
      className={`flex items-center gap-2 text-center ${
        row ? 'flex-row' : 'flex-col'
      } ${className}`.trim()}
    >
      <img
        src={LOGO_PATH}
        alt={`${APP_NAME} logo`}
        className={`shrink-0 rounded-full border border-primary/25 object-cover shadow-glow ${sizes[size] || sizes.md}`}
      />
      {wordmark && (
        <span
          className={`font-semibold tracking-tight text-ink ${
            size === 'sm' ? 'text-[15px]' : 'text-xl'
          }`}
        >
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
