import { Mail, ArrowUpRight } from 'lucide-react';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from '../components/ui/icons';
import { contactWhatsAppLink, WHATSAPP_NUMBER } from '../lib/whatsapp';

const CARDS = [
  { href: contactWhatsAppLink(), title: 'WhatsApp', sub: `+${WHATSAPP_NUMBER.replace(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')}`, Icon: WhatsAppIcon, bg: 'bg-[#25D366]' },
  { href: 'https://instagram.com/kolacollection', title: 'Instagram', sub: '@kolacollection', Icon: InstagramIcon, bg: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#515BD4]' },
  { href: 'https://tiktok.com/@kolacollection', title: 'TikTok', sub: '@kolacollection', Icon: TikTokIcon, bg: 'bg-brun-950' },
  { href: 'https://facebook.com/kolacollection', title: 'Facebook', sub: 'Kōlā Collection', Icon: FacebookIcon, bg: 'bg-[#1877F2]' },
  { href: 'mailto:contact@kolacollection.cg', title: 'E-mail', sub: 'contact@kolacollection.cg', Icon: Mail, bg: 'bg-rouille-500' },
];

export default function Contact() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-nuit-900 text-creme-50">
        <div className="absolute inset-0 -z-10 bg-[url('/images/contact.webp')] bg-cover bg-center opacity-35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-nuit-900 via-nuit-900/80 to-nuit-900/30" />
        <div className="container-k py-20 sm:py-28">
          <div className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-kaki-300 uppercase">Restons connectés</div>
          <h1 className="max-w-2xl text-4xl leading-tight text-creme-50 sm:text-6xl">Une question ? Parlons-en.</h1>
          <p className="mt-5 max-w-xl text-[16px] text-creme-200/80">
            Une taille à confirmer, une commande à suivre ou envie d'en savoir plus sur Kōlā : le plus rapide reste WhatsApp.
          </p>
        </div>
      </section>
      <div className="container-k grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, title, sub, Icon, bg }, i) => (
          <a
            key={title}
            href={href}
            target={href.startsWith('mailto') ? undefined : '_blank'}
            rel="noopener noreferrer"
            className={`group flex items-center gap-5 rounded-3xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(61,46,31,0.4)] ${i === 0 ? 'lg:col-span-1' : ''}`}
          >
            <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-white ${bg}`}>
              <Icon className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl">{title}</span>
              <span className="block truncate text-[14px] text-ink-muted">{sub}</span>
            </span>
            <ArrowUpRight className="size-5 text-ink-muted transition group-hover:rotate-45 group-hover:text-rouille-500" />
          </a>
        ))}
      </div>
    </>
  );
}
