import { ButtonLink } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-k flex flex-col items-center py-28 text-center">
      <div className="font-display text-[120px] leading-none font-light text-creme-300">404</div>
      <h1 className="mt-2 text-3xl">Cette page n'existe pas</h1>
      <p className="mt-3 text-ink-muted">Le lien est peut-être erroné, ou la page a été déplacée.</p>
      <ButtonLink to="/" className="mt-8">
        Retour à l'accueil
      </ButtonLink>
    </div>
  );
}
