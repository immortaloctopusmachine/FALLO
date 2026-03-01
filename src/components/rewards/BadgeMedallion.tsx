import { cn } from '@/lib/utils';
import {
  getBadgeMonogram,
  getBadgePalette,
  type BadgeDisplayDefinition,
} from '@/lib/rewards/presentation';

type BadgeMedallionSize = 'sm' | 'md' | 'lg' | 'xl';

interface BadgeMedallionProps {
  badge: Pick<BadgeDisplayDefinition, 'name' | 'category' | 'tier' | 'iconUrl'>;
  size?: BadgeMedallionSize;
  locked?: boolean;
  timesEarned?: number;
  renderMode?: 'medallion' | 'art';
  className?: string;
}

const SIZE_MAP: Record<
  BadgeMedallionSize,
  {
    shell: string;
    image: string;
    text: string;
    ringInset: string;
    innerInset: string;
    counter: string;
  }
> = {
  sm: {
    shell: 'h-11 w-11',
    image: 'h-7 w-7',
    text: 'text-[0.6rem]',
    ringInset: 'inset-[2px]',
    innerInset: 'inset-[6px]',
    counter: 'h-5 min-w-[1.25rem] text-[0.6rem]',
  },
  md: {
    shell: 'h-14 w-14',
    image: 'h-9 w-9',
    text: 'text-xs',
    ringInset: 'inset-[2px]',
    innerInset: 'inset-[8px]',
    counter: 'h-5 min-w-[1.25rem] text-[0.65rem]',
  },
  lg: {
    shell: 'h-20 w-20',
    image: 'h-12 w-12',
    text: 'text-sm',
    ringInset: 'inset-[3px]',
    innerInset: 'inset-[11px]',
    counter: 'h-6 min-w-[1.5rem] text-[0.72rem]',
  },
  xl: {
    shell: 'h-28 w-28',
    image: 'h-16 w-16',
    text: 'text-lg',
    ringInset: 'inset-[3px]',
    innerInset: 'inset-[14px]',
    counter: 'h-7 min-w-[1.75rem] text-[0.8rem]',
  },
};

export function BadgeMedallion({
  badge,
  size = 'md',
  locked = false,
  timesEarned,
  renderMode = 'medallion',
  className,
}: BadgeMedallionProps) {
  const palette = getBadgePalette(badge.category, badge.tier);
  const sizing = SIZE_MAP[size];

  if (renderMode === 'art') {
    return (
      <div
        className={cn(
          'relative isolate shrink-0 transition-transform duration-200',
          locked ? 'opacity-60 saturate-0' : 'hover:-translate-y-0.5',
          className
        )}
      >
        <div className={cn('flex items-center justify-center', sizing.shell)}>
          {badge.iconUrl ? (
            <img
              src={badge.iconUrl}
              alt={badge.name}
              className={cn('h-full w-full object-contain', sizing.shell)}
            />
          ) : (
            <span
              className={cn('font-black uppercase tracking-[0.12em]', sizing.text)}
              style={{ color: palette.ink }}
              aria-hidden="true"
            >
              {getBadgeMonogram(badge.name)}
            </span>
          )}
        </div>

        {timesEarned && timesEarned > 1 ? (
          <span
            className={cn(
              'absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full border border-white/20 bg-text-primary px-1.5 font-semibold text-text-inverse shadow-lg',
              sizing.counter
            )}
          >
            {timesEarned}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative isolate shrink-0 transition-transform duration-200',
        locked ? 'opacity-70 saturate-0' : 'hover:-translate-y-0.5',
        className
      )}
    >
      <div
        className={cn('absolute -inset-1 rounded-full blur-md', locked && 'opacity-40')}
        style={{ background: palette.glow }}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative overflow-hidden rounded-full border shadow-[0_10px_25px_rgba(0,0,0,0.2)]',
          sizing.shell
        )}
        style={{
          background: palette.rim,
          borderColor: palette.border,
        }}
      >
        <div
          className={cn('absolute rounded-full opacity-95', sizing.ringInset)}
          style={{ background: palette.shell }}
          aria-hidden="true"
        />
        <div
          className={cn(
            'absolute rounded-full border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
            sizing.innerInset
          )}
          style={{ background: palette.core }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          {badge.iconUrl ? (
            <img
              src={badge.iconUrl}
              alt={badge.name}
              className={cn('object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]', sizing.image)}
            />
          ) : (
            <span
              className={cn(
                'font-black uppercase tracking-[0.12em] drop-shadow-[0_1px_0_rgba(255,255,255,0.22)]',
                sizing.text
              )}
              style={{ color: palette.ink }}
              aria-hidden="true"
            >
              {getBadgeMonogram(badge.name)}
            </span>
          )}
        </div>
      </div>

      {timesEarned && timesEarned > 1 ? (
        <span
          className={cn(
            'absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full border border-white/20 bg-text-primary px-1.5 font-semibold text-text-inverse shadow-lg',
            sizing.counter
          )}
        >
          {timesEarned}
        </span>
      ) : null}
    </div>
  );
}
