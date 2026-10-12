import type { User } from '../../lib/api/types';
import { cn } from '../../lib/cn';

export const initials = (name?: string | null) =>
  (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Teintes Kōlā pour les initiales : toujours la même couleur pour une même personne */
const TINTS = [
  'from-rouille-400 to-rouille-600',
  'from-kaki-400 to-kaki-600',
  'from-ciel-400 to-nuit-500',
  'from-nuit-500 to-nuit-800',
  'from-brun-400 to-brun-800',
];
const tintFor = (name?: string | null) => TINTS[[...(name ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];

/** Photo de profil, ou initiales sur fond coloré si aucune photo */
export function Avatar({ user, className }: { user: Pick<User, 'full_name' | 'avatar_url'> | null | undefined; className?: string }) {
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" className={cn('shrink-0 rounded-full object-cover', className)} draggable={false} />;
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white select-none', tintFor(user?.full_name),
        className,
      )}
    >
      {initials(user?.full_name)}
    </span>
  );
}

/** Réduit une photo à 512 px max (JPEG) avant l'envoi : plus léger sur les connexions 3G */
export async function resizeImage(file: File, max = 512): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  // Recadrage carré centré
  const side = Math.min(bmp.width, bmp.height);
  const out = Math.round(side * scale);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Image illisible'))), 'image/jpeg', 0.86));
}
