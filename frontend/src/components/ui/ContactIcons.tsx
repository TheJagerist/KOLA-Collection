import type { ComponentType } from 'react';
import type { PaymentMethod } from '../../lib/api';
import { cn } from '../../lib/cn';
import { ClockFillIcon, MailFillIcon, PhoneFillIcon, PinFillIcon, TruckFillIcon, UserFillIcon, WhatsAppIcon } from './icons';

type Tone = 'phone' | 'location' | 'user' | 'mail' | 'time' | 'truck' | 'whatsapp';

const TONES: Record<Tone, { Icon: ComponentType<{ className?: string }>; cls: string }> = {
  phone: { Icon: PhoneFillIcon, cls: 'bg-emerald-500 text-white shadow-emerald-600/25' },
  location: { Icon: PinFillIcon, cls: 'bg-rouille-500 text-white shadow-rouille-600/25' },
  user: { Icon: UserFillIcon, cls: 'bg-indigo-500 text-white shadow-indigo-600/25' },
  mail: { Icon: MailFillIcon, cls: 'bg-sky-500 text-white shadow-sky-600/25' },
  time: { Icon: ClockFillIcon, cls: 'bg-amber-500 text-white shadow-amber-600/25' },
  truck: { Icon: TruckFillIcon, cls: 'bg-slate-700 text-white shadow-slate-800/25 dark:bg-slate-500' },
  whatsapp: { Icon: WhatsAppIcon, cls: 'bg-[#25D366] text-white shadow-emerald-600/25' },
};

/** Pastille colorée avec une icône pleine, comme les icônes d'applis du téléphone */
export function IconBadge({ tone, size = 'md', className }: { tone: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { Icon, cls } = TONES[tone];
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center shadow-sm',
        size === 'sm' && 'size-6 rounded-[7px] [&>svg]:size-3.5',
        size === 'md' && 'size-8 rounded-[10px] [&>svg]:size-[18px]',
        size === 'lg' && 'size-10 rounded-xl [&>svg]:size-5',
        cls,
        className,
      )}
    >
      <Icon />
    </span>
  );
}

/** Pastille opérateur Mobile Money (couleurs de la marque, nom écrit en texte) */
export function OperatorBadge({ op, className }: { op: PaymentMethod; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[10.5px] leading-none font-extrabold tracking-wide',
        op === 'mtn' ? 'bg-[#FFCC00] text-[#1a1a1a]' : 'bg-[#E40000] text-white',
        className,
      )}
    >
      {op === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}
    </span>
  );
}

export const telHref = (phone: string) => `tel:+242${phone.replace(/\D/g, '').replace(/^(00)?242/, '')}`;
export const mapsHref = (...parts: (string | null | undefined)[]) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([...parts.filter(Boolean), 'Congo-Brazzaville'].join(', '))}`;
