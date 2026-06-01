import { APP_NAME, LOGO_PATH } from '../../core/constants/brand';

const sizes = {
  lg: 'h-[clamp(100px,28vw,160px)] w-[clamp(100px,28vw,160px)]',
  md: 'h-[88px] w-[88px]',
  sm: 'h-11 w-11',
};

export default function BrandLogo({ size = 'md', className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`.trim()}>
      <img
        src={LOGO_PATH}
        alt={`${APP_NAME} logo`}
        className={`shrink-0 rounded-full border-2 border-edge object-cover shadow-glow ${sizes[size] || sizes.md}`}
      />
    </div>
  );
}
