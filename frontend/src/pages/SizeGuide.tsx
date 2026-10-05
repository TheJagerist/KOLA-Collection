import { useState } from 'react';
import { Clock, Sun, Ruler, PersonStanding, ListChecks } from 'lucide-react';
import { PageHeader } from '../components/ui/misc';
import { ButtonLink } from '../components/ui/Button';
import { cn } from '../lib/cn';

const TABLES = {
  garcon: {
    label: 'Garçon · kaki',
    lastCol: 'Longueur pantalon',
    rows: [
      ['9–10 ans', '10', '68 cm', '61 cm', '74 cm'],
      ['11–12 ans', '12', '72 cm', '64 cm', '82 cm'],
      ['13–14 ans', '14', '78 cm', '68 cm', '92 cm'],
      ['15–16 ans', '16', '84 cm', '72 cm', '100 cm'],
      ['16 ans et +', 'S / M', '90 cm', '76 cm', '106 cm'],
    ],
  },
  fille: {
    label: 'Fille · bleu ciel / bleu nuit',
    lastCol: 'Longueur jupe',
    rows: [
      ['9–10 ans', '10', '67 cm', '60 cm', '50 cm'],
      ['11–12 ans', '12', '72 cm', '63 cm', '54 cm'],
      ['13–14 ans', '14', '78 cm', '66 cm', '58 cm'],
      ['15–16 ans', '16', '84 cm', '69 cm', '62 cm'],
      ['16 ans et +', 'S / M', '88 cm', '72 cm', '64 cm'],
    ],
  },
} as const;

export default function SizeGuide() {
  const [tab, setTab] = useState<keyof typeof TABLES>('garcon');
  const t = TABLES[tab];

  return (
    <>
      <PageHeader kicker="Guide des tailles" title="Trouver la bonne taille du premier coup">
        Trois mesures suffisent. Un mètre ruban souple — ou une ficelle et une règle — et quelques minutes.
      </PageHeader>

      <div className="container-k py-12 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { k: 'A', title: 'Tour de poitrine', text: 'Sous les bras, au plus large du buste.', tone: 'bg-rouille-50 text-rouille-600' },
              { k: 'B', title: 'Tour de taille', text: 'Au niveau du nombril, sans serrer.', tone: 'bg-surface-2 text-ink' },
              { k: 'C', title: 'Longueur', text: "De la taille jusqu'à la cheville (ou au genou pour la jupe).", tone: 'bg-kaki-100 text-kaki-600' },
            ].map((m) => (
              <div key={m.k} className="rounded-3xl border border-line bg-surface p-6">
                <span className={cn('grid size-10 place-items-center rounded-xl font-display text-lg font-semibold', m.tone)}>{m.k}</span>
                <h3 className="mt-4 text-lg">{m.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{m.text}</p>
              </div>
            ))}
            <div className="flex gap-4 rounded-3xl bg-surface-2/60 p-6 sm:col-span-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-rouille-600" />
              <p className="text-[14.5px] text-ink-soft">
                <strong className="text-ink">Entre deux tailles ?</strong> Prenez toujours la taille au-dessus — l'enfant grandit vite.
                <span className="mx-2 text-creme-300">|</span>
                <Sun className="mr-1 inline size-4 text-rouille-600" />
                Mesurez de préférence le matin, par-dessus un vêtement fin.
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-6 rounded-[32px] bg-surface px-8 py-6">
            <Silhouette kind="garcon" />
            <Silhouette kind="fille" />
          </div>
        </div>

        <div className="mt-16">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="kicker mb-2">Correspondances</div>
              <h2 className="text-3xl sm:text-4xl">Tableau des tailles</h2>
            </div>
            <div className="inline-flex rounded-full bg-surface-2 p-1">
              {(Object.keys(TABLES) as (keyof typeof TABLES)[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn('h-10 rounded-full px-5 text-[13.5px] font-semibold transition', tab === k ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted')}
                >
                  {TABLES[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
            <table className="w-full min-w-[560px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-line bg-surface-2/50 text-[12px] tracking-wide text-ink-soft uppercase">
                  {['Âge indicatif', 'Taille Kōlā', 'Poitrine (A)', 'Taille (B)', t.lastCol + ' (C)'].map((h) => (
                    <th key={h} className="px-5 py-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r) => (
                  <tr key={r[0]} className="border-b border-line/70 last:border-0">
                    {r.map((c, i) => (
                      <td key={i} className={cn('px-5 py-4', i === 0 && 'text-ink-muted', i === 1 && 'font-display text-lg font-semibold text-ink')}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { Icon: Ruler, t: '1. Munissez-vous d’un mètre ruban', d: 'Un mètre de couturier souple, ou une ficelle que vous mesurerez ensuite avec une règle.' },
            { Icon: PersonStanding, t: '2. Faites tenir l’enfant debout', d: 'Bras relâchés le long du corps, sans vêtement épais, posture naturelle.' },
            { Icon: ListChecks, t: '3. Reportez-vous au tableau', d: 'Prenez la mesure la plus proche ; en cas de doute, choisissez la plus grande.' },
          ].map(({ Icon, t: title, d }) => (
            <div key={title} className="rounded-3xl bg-brun-900 p-7 text-creme-100">
              <Icon className="size-7 text-kaki-300" strokeWidth={1.5} />
              <h3 className="mt-5 text-xl text-creme-50">{title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-creme-200/70">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <ButtonLink to="/catalogue" size="lg">
            J'ai mes mesures, je commande
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

function Silhouette({ kind }: { kind: 'garcon' | 'fille' }) {
  const g = kind === 'garcon';
  const stroke = g ? '#8C6F47' : '#6FA8D2';
  return (
    <svg width="120" height="340" viewBox="0 0 130 380" fill="none" aria-label={g ? 'Silhouette garçon' : 'Silhouette fille'}>
      <circle cx="65" cy="45" r="26" fill="#EFE7D8" stroke={stroke} strokeWidth="2" />
      {g ? (
        <>
          <path d="M28 88 Q65 76 102 88 L108 224 Q108 244 92 246 L38 246 Q22 244 22 224 Z" fill="#C4B48A" stroke={stroke} strokeWidth="2" />
          <path d="M36 246 L32 340 Q32 348 40 348 L52 348 Q58 348 58 340 L60 246 Z" fill="#A2916A" stroke={stroke} strokeWidth="2" />
          <path d="M94 246 L98 340 Q98 348 90 348 L78 348 Q72 348 72 340 L70 246 Z" fill="#A2916A" stroke={stroke} strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M30 88 Q65 76 100 88 L104 200 Q104 214 90 216 L40 216 Q26 214 26 200 Z" fill="#9CC7E8" stroke={stroke} strokeWidth="2" />
          <path d="M32 216 L20 320 Q18 332 30 332 L100 332 Q112 332 110 320 L98 216 Z" fill="#2E4270" stroke="#1B2A4A" strokeWidth="2" />
        </>
      )}
      <path d={g ? 'M28 92 L4 165 M102 92 L126 165' : 'M30 92 L6 165 M100 92 L124 165'} stroke={stroke} strokeWidth="2" />
      <line x1="0" y1="114" x2="130" y2="114" stroke="#C9622E" strokeWidth="1.3" strokeDasharray="4 3" />
      <text x="65" y="108" fontSize="11" fontWeight="700" fill="#A94E22" textAnchor="middle">A</text>
      <line x1="0" y1={g ? 184 : 176} x2="130" y2={g ? 184 : 176} stroke="#3D2E1F" strokeWidth="1.3" strokeDasharray="4 3" />
      <text x="65" y={g ? 178 : 170} fontSize="11" fontWeight="700" fill={g ? '#3D2E1F' : '#fff'} textAnchor="middle">B</text>
      <line x1="120" y1={g ? 246 : 216} x2="120" y2={g ? 345 : 330} stroke={stroke} strokeWidth="1.3" strokeDasharray="3 3" />
      <text x="126" y={g ? 300 : 276} fontSize="11" fontWeight="700" fill="#8C6F47">C</text>
      <text x="65" y="370" fontSize="13" fontWeight="600" fill="#3D2E1F" textAnchor="middle" fontFamily="Work Sans">
        {g ? 'Garçon' : 'Fille'}
      </text>
    </svg>
  );
}
