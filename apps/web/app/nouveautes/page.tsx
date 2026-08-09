import type { Metadata } from 'next'

import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.changelog,
  description:
    'Journal des évolutions de ZENITH : fonctionnalités livrées, sources de données ajoutées et limites connues.',
  alternates: { canonical: '/nouveautes' },
}

/**
 * Journal des nouveautés.
 *
 * Les entrées décrivent des livraisons RÉELLES, datées d'après l'historique du dépôt.
 * Un changelog inventé se repère immédiatement — et sur un site dont l'argument
 * principal est de ne rien inventer, ce serait la contradiction la plus visible
 * possible (§5).
 */

interface Release {
  date: string
  /** Format lisible affiché — la date ISO sert à l'attribut `dateTime`. */
  label: string
  title: string
  items: string[]
}

const RELEASES: Release[] = [
  {
    date: '2026-08-09',
    label: '9 août 2026',
    title: 'Graphiques enrichis, comptes et centre d’aide',
    items: [
      'Graphiques : ajout des vues chandeliers, barres, ligne et écart, en complément de l’aire. Les vues en bougies n’apparaissent que si la source publie réellement de l’OHLC.',
      'Options de graphique : volume échangé, moyenne mobile adaptée à la fenêtre, et lignes de plus haut, moyenne et plus bas.',
      'Le volume est extrait de la réponse d’historique déjà récupérée : il n’occasionne aucun appel supplémentaire aux sources.',
      'Comptes utilisateurs via Clerk, avec pages de connexion et d’inscription. En l’absence de configuration, le site fonctionne normalement et l’annonce explicitement.',
      'Centre d’aide : douze articles répartis en quatre catégories, avec recherche locale et une page par article.',
      'Section Apprendre : neuf fiches classées par thème et par niveau.',
      'Nouvelles pages « Pourquoi ZENITH », « Bien démarrer » et « API & développeurs ».',
    ],
  },
  {
    date: '2026-08-09',
    label: '9 août 2026',
    title: 'Navigation, recherche et devises',
    items: [
      'Recherche universelle couvrant toutes les classes d’actifs depuis l’en-tête.',
      'En-tête centré avec quatre menus déroulants accessibles au clavier.',
      'Sélecteur de langue et de devise ; la devise choisie s’applique à l’ensemble du site.',
      'Graphiques interactifs sur les fiches d’actif, avec sélecteur de période.',
      'Pied de page complet, avec mentions de sources et rappel du cadre en lecture seule.',
    ],
  },
  {
    date: '2026-08-09',
    label: '9 août 2026',
    title: 'Socle du projet',
    items: [
      'Monorepo Turborepo et Bun, TypeScript strict.',
      'Couche d’adaptateurs de données à interface commune : CoinGecko, Frankfurter (BCE), Yahoo Finance, flux RSS d’actualités et Alternative.me.',
      'Cache à durées étagées, déduplication des appels concurrents et limitation de débit à fenêtre glissante.',
      'Design system clair crème/orange, thème sombre, bascule sans clignotement au chargement.',
      'Six classements et six fiches d’actif, catégories, actualités et indice de sentiment.',
    ],
  },
]

export default function NouveautesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <header className="space-y-3">
        <h1 className="display-lg text-ink">Nouveautés</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Ce qui a été livré, dans l’ordre. Les limites connues sont signalées au même
          titre que les ajouts — une fonctionnalité partielle est annoncée comme telle.
        </p>
      </header>

      <ol className="space-y-8">
        {RELEASES.map((release, index) => (
          <li key={index} className="relative space-y-3 border-l border-border-subtle pl-5">
            <span
              className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-strong"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <time dateTime={release.date} className="text-xs font-medium text-ink-muted">
                {release.label}
              </time>
              <h2 className="text-base font-semibold text-ink">{release.title}</h2>
            </div>
            <ul className="space-y-1.5 text-sm leading-relaxed text-ink-muted">
              {release.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <span aria-hidden="true" className="text-brand-strong">
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
