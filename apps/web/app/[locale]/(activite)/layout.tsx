import { MarketDataTabs } from '@/components/market/MarketDataTabs'

/**
 * Enveloppe commune à « Données de trading » et « Points marquants ».
 *
 * ── POURQUOI UN GROUPE DE ROUTES, ET NON DEUX PAGES QUI SE RESSEMBLENT ──────
 *
 * Les parenthèses du dossier `(activite)` le rendent INVISIBLE dans l'URL : les deux
 * pages restent `/mouvements` et `/points-marquants`. Ce que le groupe apporte
 * n'est donc pas un chemin mais une DISPOSITION PARTAGÉE, et avec elle une propriété
 * qu'aucune duplication ne peut imiter.
 *
 * Chaque page rendait sa propre barre d'onglets. Passer de l'une à l'autre détruisait
 * la première barre pour en construire une seconde — identique à l'œil, mais neuve
 * pour React, qui n'y conserve aucun état. Tant que l'onglet actif se signalait par un
 * aplat, personne ne s'en apercevait. Le trait glissant, lui, a besoin de se SOUVENIR
 * d'où il vient : détruit puis reconstruit, il réapparaît à sa nouvelle place sans
 * jamais l'avoir rejointe.
 *
 * Une disposition, elle, SURVIT à la navigation entre ses enfants. C'est la seule
 * façon, dans ce routeur, d'obtenir un mouvement continu entre deux pages distinctes.
 *
 * ⚠️ Ajouter une page ici, c'est lui donner cette barre — et donc affirmer qu'elle
 * répond à la même question que les deux autres. Une page qui n'appartient pas à cette
 * alternance n'a rien à faire dans le groupe.
 */
export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-12 sm:space-y-16">
      <MarketDataTabs />
      {children}
    </div>
  )
}
