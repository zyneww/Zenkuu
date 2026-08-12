import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { SettingsAccount } from '@/components/settings/SettingsAccount'
import { SettingsPreferences } from '@/components/settings/SettingsPreferences'
import { SettingsSources } from '@/components/settings/SettingsSources'
import { SettingsSubscription } from '@/components/settings/SettingsSubscription'

export const metadata: Metadata = {
  title: 'Paramètres',
  // Écran de réglages : personnel, et sans contenu à référencer.
  robots: { index: false, follow: false },
}

/**
 * Paramètres — colonne de rubriques à gauche, contenu à droite.
 *
 * La rubrique active est portée par l'URL (`?rubrique=`), pas par un état React.
 * Trois conséquences, toutes acquises d'un coup : l'adresse est partageable, le
 * bouton « retour » revient à la rubrique précédente, et la page se rend côté serveur
 * sans attendre l'hydratation.
 *
 * Chaque rubrique existe RÉELLEMENT — il n'y a pas d'onglet en attente. La référence
 * en aligne une dizaine ; nous en avons quatre, parce que nous n'avons ni notifications
 * à régler, ni limites de transaction, ni vérification d'identité. Quatre rubriques
 * pleines valent mieux que dix dont six annoncent « bientôt ».
 *
 * « Abonnement » respecte la même règle : sans facturation configurée, elle ne disparaît
 * pas mais DIT ce qui manque — masquer l'entrée ferait croire à un site sans offre
 * payante, alors qu'il en existe une que l'instance ne sait simplement pas encaisser.
 */

const SECTIONS = [
  { id: 'preferences', label: 'Préférences', hint: 'Langue, devise, thème' },
  { id: 'compte', label: 'Compte', hint: 'Profil, mot de passe, connexions' },
  { id: 'abonnement', label: 'Abonnement', hint: 'Votre offre et ce qu’elle ouvre' },
  { id: 'sources', label: 'Données & sources', hint: 'D’où viennent les chiffres' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

function readSection(raw: string | string[] | undefined): SectionId {
  const value = Array.isArray(raw) ? raw[0] : raw
  return SECTIONS.some((section) => section.id === value) ? (value as SectionId) : 'preferences'
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const active = readSection(params['rubrique'])

  return (
    <div className="mx-auto max-w-5xl py-6">
      <header className="mb-8 space-y-2">
        <h1 className="display-xl text-ink">Paramètres</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Vos réglages d’affichage, votre compte et votre offre. ZENKUU n’exécute aucun
          ordre et ne détient aucun fonds : le seul montant qui puisse circuler ici est
          celui de l’abonnement, et il n’y a ni limite de transaction, ni vérification
          d’identité.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Colonne de rubriques — de vrais liens, donc navigables au clavier, au
            clic milieu, et indexables par le navigateur dans son historique. */}
        <nav aria-label="Rubriques des paramètres">
          <ul className="flex gap-1 overflow-x-auto border-b border-border-subtle pb-2 lg:flex-col lg:gap-0 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <Link
                  href={`/parametres?rubrique=${section.id}`}
                  aria-current={active === section.id ? 'page' : undefined}
                  className={`block whitespace-nowrap px-3 py-2.5 transition-colors duration-150 ${
                    active === section.id
                      ? 'bg-brand-soft text-brand-strong'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                  }`}
                >
                  <span className="block text-sm font-medium">{section.label}</span>
                  <span className="hidden text-xs opacity-80 lg:block">{section.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {active === 'preferences' ? <SettingsPreferences /> : null}
          {active === 'compte' ? <SettingsAccount /> : null}
          {active === 'abonnement' ? <SettingsSubscription /> : null}
          {active === 'sources' ? <SettingsSources /> : null}
        </div>
      </div>
    </div>
  )
}
