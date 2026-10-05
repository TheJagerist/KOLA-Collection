import { PageHeader } from '../components/ui/misc';

const SECTIONS: [string, string][] = [
  [
    'Éditeur du site',
    "Le site Kōlā Collection (kolacollection.cg) est édité par [Raison sociale], [forme juridique], immatriculée sous le numéro [RCCM / NIU], dont le siège social est situé [adresse complète], République du Congo. Responsable de la publication : [Nom du responsable]. Contact : contact@kolacollection.cg.",
  ],
  ['Hébergement', "Le site est hébergé par [nom de l'hébergeur], [adresse de l'hébergeur]."],
  ['Activité', "Kōlā Collection propose la vente en ligne d'uniformes scolaires conformes au règlement en vigueur en République du Congo, avec livraison à Brazzaville et Pointe-Noire."],
  [
    'Propriété intellectuelle',
    "L'ensemble des contenus présents sur ce site (textes, logo, photographies, éléments graphiques) est la propriété de Kōlā Collection, sauf mention contraire, et ne peut être reproduit sans autorisation préalable.",
  ],
  [
    'Données personnelles',
    "Les informations collectées lors de la création de compte ou d'une commande (nom, contact, adresse de livraison, historique de commandes) sont utilisées uniquement pour le traitement des commandes et l'amélioration du service. [Détailler la politique de conservation et les droits d'accès.]",
  ],
  ['Paiement', 'Les paiements Airtel Money et MTN Mobile Money sont traités par les opérateurs concernés ; Kōlā Collection ne stocke aucune information bancaire.'],
  ['Contact', 'Pour toute question relative à ces mentions légales : contact@kolacollection.cg.'],
];

export default function Legal() {
  return (
    <>
      <PageHeader kicker="Informations" title="Mentions légales" />
      <div className="container-k max-w-3xl py-12 sm:py-16">
        <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] text-amber-900">
          Page à finaliser avec un juriste avant mise en ligne — les champs entre crochets sont à compléter avec les informations officielles de l'entreprise.
        </div>
        <div className="space-y-10">
          {SECTIONS.map(([title, text]) => (
            <section key={title}>
              <h2 className="text-2xl">{title}</h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{text}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
