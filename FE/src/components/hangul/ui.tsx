'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { ReactNode } from 'react';
import {
  Bell,
  BookMarked,
  BookOpen,
  Compass,
  Flame,
  LibraryBig,
  Medal,
  PawPrint,
  Settings,
  Sparkles,
  Swords,
  Trophy,
  UserCircle2,
  type LucideIcon,
} from 'lucide-react';

export type MainNavKey = 'Lessons' | 'Practice' | 'Arena' | 'Library';
export type SidebarKey =
  | 'course'
  | 'path'
  | 'vocabulary'
  | 'achievements'
  | 'friends';

export interface SidebarItem {
  key: SidebarKey;
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface SidebarProfile {
  title: string;
  subtitle: string;
  emoji?: string;
  tone?: MascotTone;
}

type CardTone = 'paper' | 'mint' | 'peach' | 'cocoa' | 'gold' | 'soft';
type MascotTone = 'mint' | 'peach' | 'gold' | 'cocoa' | 'paper' | 'sky';

const NAV_LINKS: Array<{ label: MainNavKey; href: string }> = [
  { label: 'Lessons', href: '/dashboard' },
  { label: 'Practice', href: '/pronunciation' },
  { label: 'Arena', href: '/tournament' },
  { label: 'Library', href: '/profile' },
];

const CARD_TONES: Record<CardTone, string> = {
  paper: 'bg-[rgba(255,251,245,0.86)]',
  mint: 'bg-[linear-gradient(135deg,#c7f0ed,#effcfb)]',
  peach: 'bg-[linear-gradient(135deg,#ffe0d3,#fff5ef)]',
  cocoa: 'bg-[linear-gradient(135deg,#8b6a5d,#6a5149)] text-white',
  gold: 'bg-[linear-gradient(135deg,#b27706,#8e5d05)] text-white',
  soft: 'bg-[rgba(250,247,240,0.94)]',
};

const MASCOT_TONES: Record<MascotTone, string> = {
  mint: 'from-[#a8ece7] via-[#d3faf6] to-[#effdfb]',
  peach: 'from-[#ffd5c8] via-[#ffe9df] to-[#fff8f4]',
  gold: 'from-[#cda453] via-[#f5dca1] to-[#fff4d7]',
  cocoa: 'from-[#8d6a5d] via-[#775b53] to-[#604843]',
  paper: 'from-[#fffdf7] via-[#f6f0e5] to-[#eee7da]',
  sky: 'from-[#aedaf5] via-[#d3efff] to-[#eff9ff]',
};

const LEVEL_META = {
  NEWBIE: {
    step: 'Level 1',
    label: 'Beginner',
    next: 'Foundations & Vowels',
    accent: '#8a6256',
    soft: '#fff1dc',
  },
  BEGINNER: {
    step: 'Level 2',
    label: 'Learner',
    next: 'Advanced Hangul',
    accent: '#7f5f54',
    soft: '#ffe0d5',
  },
  INTERMEDIATE: {
    step: 'Level 3',
    label: 'Challenger',
    next: 'Complex Structures',
    accent: '#4c807f',
    soft: '#d7f5f4',
  },
  UPPER: {
    step: 'Level 4',
    label: 'Master',
    next: 'Culture & Nuance',
    accent: '#ba7d0a',
    soft: '#ffefcb',
  },
  ADVANCED: {
    step: 'Level 5',
    label: 'Grandmaster',
    next: 'Native Fluency',
    accent: '#8b6a5d',
    soft: '#eadfd8',
  },
} as const;

export function getLevelMeta(level?: string) {
  const safeLevel = (level ?? 'NEWBIE') as keyof typeof LEVEL_META;
  return LEVEL_META[safeLevel] ?? LEVEL_META.NEWBIE;
}

export function getSidebarItems(active: SidebarKey): SidebarItem[] {
  return [
    { key: 'course', label: 'Current Course', href: '/dashboard', icon: BookOpen, active: active === 'course' },
    { key: 'path', label: 'Learning Path', href: '/learning-map', icon: Compass, active: active === 'path' },
    { key: 'vocabulary', label: 'Vocabulary', href: '/camera', icon: BookMarked, active: active === 'vocabulary' },
    { key: 'achievements', label: 'Achievements', href: '/profile', icon: Trophy, active: active === 'achievements' },
    { key: 'friends', label: 'Otter Friends', href: '/profile', icon: PawPrint, active: active === 'friends' },
  ];
}

export function HangulTopNav({
  active,
  avatar = '🦦',
}: {
  active: MainNavKey;
  avatar?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(125,98,86,0.08)] bg-[rgba(249,245,238,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="text-[2rem] font-black tracking-[-0.04em] text-[var(--hangul-ink)]">
          HANGUL
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                'border-b-[3px] pb-1 text-lg font-semibold transition-colors',
                active === item.label
                  ? 'border-[var(--hangul-accent)] text-[var(--hangul-ink)]'
                  : 'border-transparent text-[var(--hangul-muted)] hover:text-[var(--hangul-ink)]'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button className="grid h-10 w-10 place-items-center rounded-full text-[var(--hangul-ink)] transition hover:bg-white/70">
            <Bell className="h-5 w-5" />
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-full text-[var(--hangul-ink)] transition hover:bg-white/70">
            <Settings className="h-5 w-5" />
          </button>
          <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-white bg-[linear-gradient(140deg,#17354c,#0f1722)] text-2xl shadow-[0_18px_42px_rgba(54,36,30,0.22)]">
            <span>{avatar}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function HangulPageFrame({
  activeNav,
  sidebar,
  children,
  contentClassName,
}: {
  activeNav: MainNavKey;
  sidebar?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="min-h-screen">
      <HangulTopNav active={activeNav} />
      <main className="mx-auto max-w-[1520px] px-4 pb-10 pt-7 sm:px-7">
        <div className={clsx(sidebar ? 'grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]' : '', contentClassName)}>
          {sidebar ? <div>{sidebar}</div> : null}
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function HangulSidebar({
  profile,
  items,
  ctaLabel = 'Go to Arena',
  ctaHref = '/tournament',
}: {
  profile: SidebarProfile;
  items: SidebarItem[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <aside className="sticky top-[104px] overflow-hidden rounded-[36px] bg-[rgba(255,251,245,0.78)] p-6 shadow-[0_32px_70px_rgba(123,97,78,0.12)] backdrop-blur-xl">
      <div className="mb-10 flex items-center gap-4 rounded-[28px] bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div
          className={clsx(
            'grid h-16 w-16 place-items-center rounded-full border-4 border-white text-3xl shadow-[0_16px_34px_rgba(98,75,62,0.18)]',
            `bg-gradient-to-br ${MASCOT_TONES[profile.tone ?? 'paper']}`
          )}
        >
          <span>{profile.emoji ?? '🦦'}</span>
        </div>
        <div>
          <p className="text-[1.05rem] font-bold leading-tight text-[var(--hangul-ink)]">{profile.title}</p>
          <p className="mt-1 text-sm leading-snug text-[var(--hangul-muted)]">{profile.subtitle}</p>
        </div>
      </div>

      <nav className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                'flex items-center gap-4 rounded-full px-5 py-4 text-lg font-semibold transition-all',
                item.active
                  ? 'bg-[linear-gradient(135deg,#a58072,#7f5f54)] text-white shadow-[0_20px_34px_rgba(126,94,82,0.22)]'
                  : 'text-[var(--hangul-muted)] hover:bg-white/75 hover:text-[var(--hangul-ink)]'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href={ctaHref}
        className="mt-16 block rounded-full bg-[linear-gradient(135deg,#ae7600,#8d5d00)] px-6 py-5 text-center text-xl font-bold text-white shadow-[0_28px_40px_rgba(155,110,6,0.24)] transition hover:translate-y-[-1px]"
      >
        {ctaLabel}
      </Link>
    </aside>
  );
}

export function HangulCard({
  children,
  className,
  tone = 'paper',
}: {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
}) {
  return (
    <section
      className={clsx(
        'overflow-hidden rounded-[36px] border border-white/50 shadow-[0_26px_65px_rgba(122,97,78,0.1)] backdrop-blur-xl',
        CARD_TONES[tone],
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--hangul-soft-ink)]">
      {children}
    </p>
  );
}

export function ProgressBar({
  value,
  className,
  fillClassName,
}: {
  value: number;
  className?: string;
  fillClassName?: string;
}) {
  return (
    <div className={clsx('h-4 rounded-full bg-[rgba(119,92,76,0.08)]', className)}>
      <div
        className={clsx(
          'h-full rounded-full bg-[linear-gradient(90deg,#8b6658,#a57b6e)] transition-all',
          fillClassName
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--hangul-soft-ink)] shadow-[0_10px_24px_rgba(120,98,80,0.08)]',
        className
      )}
    >
      {children}
    </span>
  );
}

export function MascotPortrait({
  emoji = '🦦',
  label,
  tone = 'paper',
  className,
}: {
  emoji?: string;
  label?: string;
  tone?: MascotTone;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[34px] border border-white/50 shadow-[0_28px_60px_rgba(116,91,74,0.14)]',
        className
      )}
    >
      <div className={clsx('absolute inset-0 bg-gradient-to-br', MASCOT_TONES[tone])} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_50%_120%,rgba(66,54,45,0.16),transparent_48%)]" />
      <div className="relative flex h-full w-full items-center justify-center p-6">
        <div className="grid h-28 w-28 place-items-center rounded-full border-[6px] border-white bg-[rgba(255,255,255,0.78)] text-[3.65rem] shadow-[0_20px_45px_rgba(102,78,63,0.18)]">
          <span>{emoji}</span>
        </div>
      </div>
      {label ? (
        <div className="absolute bottom-4 left-4 rounded-full bg-white/84 px-4 py-2 text-sm font-semibold text-[var(--hangul-ink)] shadow-[0_10px_24px_rgba(120,98,80,0.12)]">
          {label}
        </div>
      ) : null}
    </div>
  );
}

export function DonutProgress({
  value,
  label,
  sublabel,
  size = 220,
}: {
  value: number;
  label: string;
  sublabel: string;
  size?: number;
}) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className="relative grid place-items-center rounded-full bg-[rgba(255,255,255,0.72)]"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--hangul-gold) ${safeValue * 3.6}deg, rgba(121,97,82,0.1) 0deg)`,
      }}
    >
      <div className="grid h-[78%] w-[78%] place-items-center rounded-full bg-[rgba(255,250,243,0.96)] text-center shadow-[inset_0_0_0_1px_rgba(115,89,72,0.08)]">
        <div>
          <p className="text-[3.2rem] font-black tracking-[-0.05em] text-[var(--hangul-ink)]">{label}</p>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--hangul-soft-ink)]">
            {sublabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatusChip({
  icon,
  label,
  tone = 'paper',
}: {
  icon?: ReactNode;
  label: string;
  tone?: 'paper' | 'mint' | 'peach' | 'gold';
}) {
  const toneClass =
    tone === 'mint'
      ? 'bg-[#d9f7f4] text-[#315e5c]'
      : tone === 'peach'
        ? 'bg-[#ffe3d8] text-[#8b5d50]'
        : tone === 'gold'
          ? 'bg-[#ffe8b3] text-[#956403]'
          : 'bg-white/75 text-[var(--hangul-soft-ink)]';

  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold', toneClass)}>
      {icon}
      {label}
    </span>
  );
}

export function HeaderStats({
  xp,
  streak,
  wins,
}: {
  xp: number;
  streak: number;
  wins: number;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <StatusChip icon={<Sparkles className="h-4 w-4" />} label={`${xp} XP earned`} tone="mint" />
      <StatusChip icon={<Flame className="h-4 w-4" />} label={`${streak} day streak`} tone="gold" />
      <StatusChip icon={<Medal className="h-4 w-4" />} label={`${wins} arena wins`} tone="peach" />
    </div>
  );
}

export function FooterBrand() {
  return (
    <footer className="border-t border-[rgba(130,104,89,0.08)] px-5 py-12 text-sm text-[var(--hangul-muted)] sm:px-8">
      <div className="mx-auto flex max-w-[1520px] flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <p className="text-xl font-black text-[var(--hangul-ink)]">HANGUL</p>
          <p className="mt-3 leading-7">
            Elevating Korean education through tactile interfaces, playful arenas, and a mascot-led learning journey.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-bold text-[var(--hangul-ink)]">Platform</p>
            <ul className="mt-3 space-y-2">
              <li>Courses</li>
              <li>Arena</li>
              <li>Library</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-[var(--hangul-ink)]">Resources</p>
            <ul className="mt-3 space-y-2">
              <li>Blog</li>
              <li>Teachers</li>
              <li>Support</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-[var(--hangul-ink)]">Company</p>
            <ul className="mt-3 space-y-2">
              <li>About</li>
              <li>Careers</li>
              <li>Privacy</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MiniRail() {
  const railItems = [
    { icon: BookOpen, href: '/dashboard' },
    { icon: Compass, href: '/learning-map' },
    { icon: LibraryBig, href: '/camera' },
    { icon: Swords, href: '/tournament' },
    { icon: PawPrint, href: '/profile' },
  ];

  return (
    <div className="flex w-[104px] flex-col items-center gap-6 rounded-[34px] bg-[rgba(255,251,245,0.78)] px-4 py-8 shadow-[0_24px_60px_rgba(121,96,79,0.12)] backdrop-blur-xl">
      {railItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'grid h-14 w-14 place-items-center rounded-full transition',
              index === 3
                ? 'bg-[linear-gradient(135deg,#a47c6d,#7f5f54)] text-white shadow-[0_18px_32px_rgba(123,90,78,0.2)]'
                : 'text-[var(--hangul-muted)] hover:bg-white/80 hover:text-[var(--hangul-ink)]'
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </div>
  );
}

export function ProfileOrb({
  emoji = '🦦',
  size = 'lg',
}: {
  emoji?: string;
  size?: 'sm' | 'lg';
}) {
  const orbSize = size === 'sm' ? 'h-14 w-14 text-2xl' : 'h-32 w-32 text-5xl';
  return (
    <div className={clsx('grid place-items-center rounded-full border-[6px] border-white bg-[linear-gradient(145deg,#101318,#27323d)] shadow-[0_28px_52px_rgba(38,29,25,0.24)]', orbSize)}>
      <span>{emoji}</span>
    </div>
  );
}

export const HANGUL_ICONS = {
  BookOpen,
  Compass,
  LibraryBig,
  Trophy,
  PawPrint,
  Sparkles,
  Medal,
  Flame,
  UserCircle2,
};
