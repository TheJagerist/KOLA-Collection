import { Link } from 'react-router-dom';
import { Logo } from '../ui/misc';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from '../ui/icons';
import { contactWhatsAppLink } from '../../lib/whatsapp';
import { API_MODE } from '../../lib/api';

const socials = [
  { href: 'https://instagram.com/kolacollection', label: 'Instagram', Icon: InstagramIcon, bg: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#515BD4]' },
  { href: 'https://tiktok.com/@kolacollection', label: 'TikTok', Icon: TikTokIcon, bg: 'bg-black ring-1 ring-white/20' },
  { href: 'https://facebook.com/kolacollection', label: 'Facebook', Icon: FacebookIcon, bg: 'bg-[#1877F2]' },
  { href: contactWhatsAppLink(), label: 'WhatsApp', Icon: WhatsAppIcon, bg: 'bg-[#25D366]' },
];

export function Socials({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {socials.map(({ href, label, Icon, bg }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={`grid place-items-center rounded-full text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 ${size === 'sm' ? 'size-9' : 'size-10'} ${bg}`}
        >
          <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} />
        </a>
      ))}
    </div>
  );
}

// Masqué sur mobile : la barre de navigation du bas et le menu ☰ (contact, réseaux, mentions) prennent le relais
export function Footer() {
  return (
    <footer className="relative isolate hidden overflow-hidden bg-brun-950 text-creme-200 sm:block">
      <div className="absolute inset-0 -z-10 bg-[url('/images/footer.webp')] bg-cover bg-center opacity-[0.12]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brun-950/60 to-brun-950" />
      {/* ---------- Tablette / ordinateur ---------- */}
      <div className="container-k pt-16 pb-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="light" className="h-10" />
            <p className="mt-5 max-w-xs text-[14.5px] leading-relaxed text-creme-200/70">
              La plateforme de commande d'uniformes scolaires au Congo. Kaki, bleu ciel et bleu de nuit : conforme au règlement, livré où vous êtes.
            </p>
            <Socials className="mt-6" />
          </div>
          <FooterCol title="Boutique" links={[['Catalogue', '/catalogue'], ['Guide des tailles', '/guide-des-tailles'], ['Mon panier', '/panier']]} />
          <FooterCol title="Aide" links={[['Comment ça marche', '/#comment-ca-marche'], ['Contact', '/contact'], ['Mon compte', '/compte']]} />
          <FooterCol title="Kōlā" links={[['À propos', '/a-propos'], ['Mentions légales', '/mentions-legales']]} />
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-creme-200/10 pt-6 text-[13px] text-creme-200/50 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Kōlā Collection — République du Congo</span>
          <span className="flex items-center gap-3">
            {API_MODE === 'mock' && <span className="rounded-full border border-creme-200/15 px-2.5 py-0.5 text-[11px]">Mode démo · données simulées</span>}
            Brazzaville · Pointe-Noire
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h5 className="mb-4 text-[11px] font-semibold tracking-[0.18em] text-kaki-300 uppercase">{title}</h5>
      <ul className="space-y-2.5">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-[14.5px] text-creme-200/75 transition hover:text-creme-50">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
