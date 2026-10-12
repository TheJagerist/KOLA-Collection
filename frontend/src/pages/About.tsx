import { PageHeader } from '../components/ui/misc';
import { ButtonLink } from '../components/ui/Button';

export default function About() {
  return (
    <>
      <PageHeader kicker="À propos" title="Pourquoi Kōlā existe">
        Chaque rentrée scolaire, s'équiper en uniforme reste un parcours plus compliqué qu'il ne devrait l'être.
      </PageHeader>
      <div className="container-k py-14 sm:py-20">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[28px] border border-line bg-surface p-8 sm:p-10">
            <div className="kicker mb-3">Le problème</div>
            <h2 className="text-3xl">La queue au marché, chaque année</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
              Trouver l'uniforme réglementaire — kaki pour les garçons, bleu ciel et bleu de nuit pour les filles — veut souvent dire faire la queue au marché,
              comparer les prix chez plusieurs vendeurs, et recommencer l'année suivante sans garantie de retrouver la même qualité ni la bonne taille.
            </p>
          </article>
          <article className="rounded-[28px] bg-brun-900 p-8 text-creme-100 sm:p-10">
            <div className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-kaki-300 uppercase">Notre réponse</div>
            <h2 className="text-3xl text-creme-50">Tout au même endroit</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-creme-200/75">
              Un catalogue clair par taille et par niveau, un paiement Airtel Money ou MTN Mobile Money, et une livraison à domicile à Brazzaville et
              Pointe-Noire. Les parents commandent en quelques minutes ; les élèves assez grands peuvent aussi commander eux-mêmes.
            </p>
          </article>
        </div>
        <div className="mx-auto mt-20 max-w-3xl text-center">
          <h2 className="text-4xl sm:text-5xl">Ce que nous construisons</h2>
          <p className="mt-5 text-[16.5px] leading-relaxed text-ink-soft">
            Une plateforme simple, fiable et pensée pour le Congo : des tissus conformes au règlement scolaire, des tailles fiables grâce à notre guide de mesure,
            et un service qui grandit avec les besoins des familles congolaises.
          </p>
          <ButtonLink to="/catalogue" size="lg" className="mt-8">
            Découvrir le catalogue
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
