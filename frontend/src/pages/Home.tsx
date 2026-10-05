import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, AnimatePresence, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ArrowUpRight, ChevronDown, CreditCard, Ruler, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { useProducts, useStorefront } from '../hooks/queries';
import { useAuth } from '../stores/auth';
import { ButtonLink } from '../components/ui/Button';
import { Chip } from '../components/ui/misc';
import { WhatsAppIcon } from '../components/ui/icons';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import type { Category } from '../lib/api/types';
import { CATEGORY_PLURAL } from '../lib/format';
import { contactWhatsAppLink } from '../lib/whatsapp';

const EASE = [0.22, 1, 0.36, 1] as const;

const FALLBACK = {
  hero_eyebrow: "L'uniforme de la rentrée, sans la queue au marché",
  hero_title: "L'uniforme scolaire, commandé en quelques clics.",
  hero_lede:
    "Kōlā habille les élèves du Congo avec l'uniforme réglementaire : kaki pour les garçons, bleu ciel et bleu de nuit pour les filles. Livré directement chez vous.",
  cta_primary_label: 'Voir le catalogue',
};

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <KeyFigures />
      <Selection />
      <Ensembles />
      <Lookbook />
      <Steps />
      <Trust />
      <FinalCta />
    </>
  );
}

/* ================================================================ HERO */
function Hero() {
  const { data } = useStorefront();
  const user = useAuth((s) => s.user);
  const content = data?.homepage ?? FALLBACK;
  const images = data?.carousel ?? [];
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLElement>(null);

  // Parallaxe : l'image descend moins vite que la page, le texte s'estompe
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Carte qui suit légèrement la souris (ordinateur)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 14 });

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), 5500);
    return () => clearInterval(t);
  }, [images.length]);

  const words = content.hero_title.split(' ');

  return (
    <section
      ref={ref}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      className="relative isolate overflow-hidden bg-nuit-900 text-creme-50"
    >
      <motion.div className="absolute inset-0 -z-20" style={{ y: bgY }}>
        <AnimatePresence mode="sync">
          {images[index] && (
            <motion.img
              key={images[index].id}
              src={images[index].image_url}
              alt=""
              initial={{ opacity: 0, scale: 1.12 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.4 }, scale: { duration: 7, ease: 'linear' } }}
              className="absolute inset-0 size-full object-cover"
            />
          )}
        </AnimatePresence>
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-nuit-900 via-nuit-900/85 to-nuit-900/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-nuit-900/90 via-transparent to-transparent" />
      <motion.div
        aria-hidden
        className="absolute -top-40 -left-40 -z-10 size-[520px] rounded-full bg-rouille-500/25 blur-[120px]"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container-k grid min-h-[calc(100svh-6.25rem)] items-center gap-12 py-16 sm:min-h-[640px] lg:min-h-[720px] lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <motion.div style={{ y: textY, opacity: textOpacity }}>
          <motion.div
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-creme-50/15 bg-creme-50/5 px-4 py-1.5 text-[12.5px] font-medium text-kaki-200 backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-rouille-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-rouille-400" />
            </span>
            {content.hero_eyebrow}
          </motion.div>

          <h1 className="max-w-2xl text-[42px] leading-[1.02] font-medium text-creme-50 sm:text-6xl lg:text-[76px]" aria-label={content.hero_title}>
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
                <motion.span
                  className="inline-block"
                  initial={{ y: '110%', rotate: 4 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: EASE }}
                >
                  {w}&nbsp;
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="mt-6 max-w-xl text-base leading-relaxed text-creme-200/80 sm:text-lg"
          >
            {content.hero_lede}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.62 }} className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to="/catalogue" size="lg" className="group" icon={<ArrowRight className="order-last size-4 transition group-hover:translate-x-1" />}>
              {content.cta_primary_label || 'Voir le catalogue'}
            </ButtonLink>
            {!user && (
              <ButtonLink to="/inscription" size="lg" variant="outline" className="border-creme-50/25 text-creme-50 hover:border-creme-50/60 hover:bg-creme-50/5">
                Créer mon compte
              </ButtonLink>
            )}
          </motion.div>

          {images.length > 1 && (
            <div className="mt-12 flex gap-1.5" aria-label="Images d'arrière-plan">
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setIndex(i)} aria-label={`Image ${i + 1}`} className="relative h-1 w-9 overflow-hidden rounded-full bg-creme-50/20">
                  {i === index && (
                    <motion.span className="absolute inset-0 origin-left rounded-full bg-creme-50" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 5.5, ease: 'linear' }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: EASE }}
          className="hidden justify-self-end [perspective:1000px] lg:block"
        >
          <motion.div style={{ rotateX: rx, rotateY: ry }}>
            <div className="animate-float">
              <UniformCard />
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.a
        href="#chiffres"
        aria-label="Faire défiler"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] tracking-[0.2em] text-creme-200/60 uppercase sm:flex"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Découvrir
        <ChevronDown className="size-4" />
      </motion.a>
    </section>
  );
}

function UniformCard() {
  return (
    <div className="w-[380px] rounded-[28px] border border-white/10 bg-[#fffdf9]/95 p-6 text-[#241a11] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-lg font-semibold">Fiche uniforme</div>
          <div className="text-[13px] text-kaki-600">Collège & lycée — deux ensembles</div>
        </div>
        <span className="rounded-full bg-[#efe7d8] px-3 py-1 text-[11px] font-semibold">6ème · Taille 12</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Swatch className="bg-gradient-to-br from-kaki-300 to-kaki-400" title="Garçon" sub="Chemise + pantalon kaki" />
        <Swatch className="bg-gradient-to-br from-ciel-300 to-ciel-400" title="Fille · haut" sub="Chemise bleu ciel" />
        <Swatch className="bg-gradient-to-br from-kaki-400 to-kaki-600" title="Garçon · bas" sub="Pantalon coupe large" light />
        <Swatch className="bg-gradient-to-br from-nuit-500 to-nuit-800" title="Fille · bas" sub="Jupe ou pantalon bleu nuit" light />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#e1d6c1] pt-4 text-[13px]">
        <span className="tracking-widest text-rouille-500">★★★★★</span>
        <span className="flex items-center gap-1.5 font-medium text-[#5c4a34]">
          <ShieldCheck className="size-4 text-emerald-700" /> Conforme au règlement
        </span>
      </div>
    </div>
  );
}

function Swatch({ className, title, sub, light }: { className: string; title: string; sub: string; light?: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, rotate: -1 }}
      className={`flex aspect-[5/4] flex-col justify-end rounded-2xl p-3.5 ${className} ${light ? 'text-creme-50' : 'text-brun-900'}`}
    >
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="text-[11.5px] opacity-75">{sub}</div>
    </motion.div>
  );
}

/* ================================================================ MARQUEE */
function Marquee() {
  const items = [
    { Icon: ShieldCheck, text: 'Tissu aux couleurs du règlement' },
    { Icon: Ruler, text: 'Tailles du collège au lycée' },
    { Icon: Smartphone, text: 'Paiement Airtel Money & MTN MoMo' },
    { Icon: Truck, text: 'Livraison à Brazzaville et Pointe-Noire' },
    { Icon: CreditCard, text: '50 % à la commande, le reste à la livraison' },
  ];
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-line bg-surface py-4">
      <div className="flex w-max animate-marquee gap-12 pr-12 hover:[animation-play-state:paused]">
        {row.map(({ Icon, text }, i) => (
          <span key={i} className="flex items-center gap-2.5 text-[14px] font-medium whitespace-nowrap text-ink-soft" aria-hidden={i >= items.length}>
            <Icon className="size-4 text-rouille-500" />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ CHIFFRES CLÉS */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: EASE, onUpdate: (v) => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {val}
      {suffix}
    </span>
  );
}

function KeyFigures() {
  const figures = [
    { n: 2, suffix: '', label: 'villes livrées', sub: 'Brazzaville & Pointe-Noire' },
    { n: 72, suffix: ' h', label: 'maximum', sub: 'pour recevoir votre commande' },
    { n: 50, suffix: ' %', label: 'à la commande', sub: 'le solde à la livraison' },
    { n: 6, suffix: '', label: 'tailles', sub: 'du 10 ans au S/M' },
  ];
  return (
    <section id="chiffres" className="container-k scroll-mt-24 pt-16 sm:pt-24">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-line bg-line lg:grid-cols-4">
        {figures.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            className="bg-surface p-6 sm:p-8"
          >
            <div className="font-display text-5xl font-medium text-ink sm:text-6xl">
              <Counter to={f.n} suffix={f.suffix} />
            </div>
            <div className="mt-2 text-[14.5px] font-semibold text-ink">{f.label}</div>
            <div className="text-[13px] text-ink-muted">{f.sub}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================ SÉLECTION */
function Selection() {
  const [cat, setCat] = useState<Category | 'tout'>('tout');
  const { data, isLoading } = useProducts({ sort: 'populaires' });
  const list = (data ?? []).filter((p) => cat === 'tout' || p.cat === cat).slice(0, 4);

  return (
    <section className="container-k py-20 sm:py-28">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Reveal>
          <div className="kicker mb-3">Notre sélection</div>
          <h2 className="text-4xl sm:text-5xl">L'essentiel de l'uniforme</h2>
        </Reveal>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <Chip active={cat === 'tout'} onClick={() => setCat('tout')}>
            Tout
          </Chip>
          {(['chemise', 'pantalon', 'jupe'] as Category[]).map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_PLURAL[c]}
            </Chip>
          ))}
        </div>
      </div>

      <motion.div layout className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : list.map((p, i) => (
              <motion.div key={p.id} layout transition={{ duration: 0.4, ease: EASE }}>
                <ProductCard product={p} index={i} />
              </motion.div>
            ))}
      </motion.div>
      {!isLoading && list.length === 0 && <p className="py-10 text-center text-ink-muted">Aucun article dans cette catégorie pour le moment.</p>}

      <div className="mt-12 flex justify-center">
        <ButtonLink to={cat === 'tout' ? '/catalogue' : `/catalogue?cat=${cat}`} variant="outline" className="group" icon={<ArrowRight className="order-last size-4 transition group-hover:translate-x-1" />}>
          Voir tout le catalogue
        </ButtonLink>
      </div>
    </section>
  );
}

/* ================================================================ ENSEMBLES */
function Ensembles() {
  return (
    <section className="container-k pb-20 sm:pb-28">
      <div className="grid gap-4 md:grid-cols-2">
        <EnsembleTile
          to="/catalogue?ensemble=garcon"
          title="Ensemble garçon"
          sub="Chemise et pantalon kaki"
          image="/images/ensemble-garcon.webp"
          className="bg-[#e7dfcc] dark:bg-[#3a3124]"
          dots={['bg-kaki-300', 'bg-kaki-600']}
        />
        <EnsembleTile
          to="/catalogue?ensemble=fille"
          title="Ensemble fille"
          sub="Chemise bleu ciel, jupe ou pantalon bleu nuit"
          image="/images/ensemble-fille.webp"
          className="bg-[#dfe6ee] dark:bg-[#1f2a3d]"
          dots={['bg-ciel-300', 'bg-nuit-800']}
        />
      </div>
    </section>
  );
}

function EnsembleTile({ to, title, sub, image, className, dots }: { to: string; title: string; sub: string; image: string; className: string; dots: string[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: EASE }}>
      <Link to={to} className={`group relative flex min-h-[280px] overflow-hidden rounded-[32px] p-7 sm:min-h-[420px] sm:p-10 ${className}`}>
        <div className="relative z-10 flex max-w-[48%] flex-col">
          <div className="flex gap-1.5">
            {dots.map((d) => (
              <span key={d} className={`size-4 rounded-full ring-2 ring-white/70 ${d}`} />
            ))}
          </div>
          <h3 className="mt-5 text-[28px] leading-tight sm:text-4xl">{title}</h3>
          <p className="mt-2 text-[15px] text-ink-soft">{sub}</p>
          <span className="mt-auto inline-flex items-center gap-2 pt-8 text-[14px] font-semibold text-ink">
            Découvrir
            <span className="grid size-9 place-items-center rounded-full bg-inverse text-on-inverse transition group-hover:bg-rouille-500 group-hover:text-white">
              <ArrowUpRight className="size-4 transition group-hover:rotate-45" />
            </span>
          </span>
        </div>
        <img
          src={image}
          alt=""
          className="absolute inset-y-3 right-3 w-[46%] max-w-[300px] rounded-[24px] object-cover transition duration-700 ease-out-soft group-hover:scale-[1.04] group-hover:-rotate-1"
        />
      </Link>
    </motion.div>
  );
}

/* ================================================================ LOOKBOOK */
function Lookbook() {
  const { data } = useStorefront();
  const { data: products } = useProducts();
  const pics = [
    ...(data?.carousel ?? []).map((c) => ({ id: `c${c.id}`, src: c.image_url, caption: '' })),
    ...(products ?? []).filter((p) => p.image_url).map((p) => ({ id: `p${p.id}`, src: p.image_url!, caption: p.name })),
  ];
  if (pics.length < 3) return null;
  const row = [...pics, ...pics];

  return (
    <section className="overflow-hidden pb-20 sm:pb-28">
      <div className="container-k mb-10 flex items-end justify-between gap-6">
        <Reveal>
          <div className="kicker mb-3">Lookbook</div>
          <h2 className="text-4xl sm:text-5xl">La rentrée en images</h2>
        </Reveal>
        <a
          href="https://instagram.com/kolacollection"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 text-[14px] font-semibold text-rouille-600 hover:underline sm:flex"
        >
          @kolacollection <ArrowUpRight className="size-4" />
        </a>
      </div>
      <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-4 hover:[animation-play-state:paused]">
        {row.map((p, i) => (
          <figure key={`${p.id}-${i}`} className="group relative h-[300px] w-[230px] shrink-0 overflow-hidden rounded-[24px] bg-photo sm:h-[380px] sm:w-[290px]" aria-hidden={i >= pics.length}>
            <img src={p.src} alt={p.caption} loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
            {p.caption && (
              <figcaption className="absolute inset-x-3 bottom-3 translate-y-2 rounded-xl bg-surface/90 px-3 py-2 text-[13px] font-medium text-ink opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100">
                {p.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ================================================================ ÉTAPES */
function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const steps = [
    { n: '01', title: 'Choisissez les tailles', text: "Ajoutez les articles de l'ensemble et indiquez la taille et le niveau de chaque enfant." },
    { n: '02', title: "Réglez l'acompte", text: 'Validez la commande et payez 50 % via Airtel Money ou MTN Mobile Money.' },
    { n: '03', title: 'Recevez chez vous', text: 'Livraison à domicile sous 48 à 72 h en zone urbaine. Le solde se règle à la livraison.' },
  ];
  return (
    <section id="comment-ca-marche" className="scroll-mt-24 overflow-x-clip bg-brun-900 py-20 text-creme-100 sm:py-28">
      <div className="container-k grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-kaki-300 uppercase">Le parcours</div>
          <h2 className="text-4xl text-creme-50 sm:text-5xl">Comment ça marche</h2>
          <p className="mt-4 max-w-sm text-[15.5px] leading-relaxed text-creme-200/70">Trois étapes, sans file d'attente ni déplacement. Vous suivez tout depuis votre compte.</p>
          <ButtonLink to="/catalogue" className="mt-8" icon={<ArrowRight className="order-last size-4" />}>
            Commencer
          </ButtonLink>
        </div>
        <div ref={ref} className="relative pl-12 sm:pl-16">
          <div className="absolute top-2 bottom-2 left-[15px] w-px bg-creme-50/10 sm:left-[23px]" />
          <motion.div style={{ scaleY: line }} className="absolute top-2 bottom-2 left-[15px] w-px origin-top bg-gradient-to-b from-rouille-400 to-kaki-300 sm:left-[23px]" />
          <div className="space-y-14">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.05, duration: 0.6, ease: EASE }}
                className="relative"
              >
                <span className="absolute top-0 -left-12 grid size-8 place-items-center rounded-full bg-rouille-500 text-[12px] font-bold text-white ring-4 ring-brun-900 sm:-left-16 sm:size-12 sm:text-sm">
                  {s.n}
                </span>
                <h3 className="text-2xl text-creme-50 sm:text-3xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-creme-200/70">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================ CONFIANCE */
function Trust() {
  const items = [
    { Icon: ShieldCheck, title: 'Tissu conforme', text: 'Kaki pour les garçons, bleu ciel et bleu de nuit pour les filles, comme le prévoit le règlement scolaire.' },
    { Icon: Smartphone, title: 'Paiement local', text: 'Airtel Money ou MTN Mobile Money : pas besoin de carte bancaire.' },
    { Icon: Truck, title: 'Livraison suivie', text: 'Suivez chaque étape de votre commande depuis votre compte, jusqu’à votre porte.' },
  ];
  return (
    <section className="container-k grid gap-14 py-20 sm:py-28 lg:grid-cols-2 lg:items-center">
      <Reveal>
        <figure>
          <div className="font-display text-7xl leading-none text-rouille-500">“</div>
          <blockquote className="font-display text-3xl leading-snug text-ink sm:text-4xl">
            On a commandé les uniformes de mes trois enfants en dix minutes, sans faire la queue au marché.
          </blockquote>
          <figcaption className="mt-6 text-[15px] text-ink-muted">— Une maman à Pointe-Noire</figcaption>
        </figure>
      </Reveal>
      <div className="space-y-3">
        {items.map(({ Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
            whileHover={{ x: 6 }}
            className="flex gap-5 rounded-3xl border border-line bg-surface p-6"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-rouille-600">
              <Icon className="size-5" />
            </div>
            <div>
              <h4 className="text-lg">{title}</h4>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">{text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================ CTA FINAL */
function FinalCta() {
  return (
    <section className="container-k pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative overflow-hidden rounded-[32px] bg-rouille-500 px-7 py-12 text-white sm:px-14 sm:py-16"
      >
        <Ruler className="absolute -right-6 -bottom-10 size-64 rotate-12 text-white/10" strokeWidth={1} />
        <motion.div
          aria-hidden
          className="absolute -top-24 right-1/3 size-72 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl text-white sm:text-5xl">Prêt pour la rentrée ?</h2>
            <p className="mt-3 max-w-lg text-[15.5px] text-white/85">
              Mesurez votre enfant avec notre guide, commandez en quelques minutes, et recevez l'uniforme chez vous. Une question ? On répond sur WhatsApp.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <ButtonLink to="/guide-des-tailles" variant="light" size="lg" icon={<Ruler className="size-4" />}>
              Guide des tailles
            </ButtonLink>
            <a
              href={contactWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-[15px] font-semibold text-white transition hover:bg-white/10"
            >
              <WhatsAppIcon className="size-5" /> Nous écrire
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ================================================================ UTIL */
function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: EASE }}>
      {children}
    </motion.div>
  );
}
