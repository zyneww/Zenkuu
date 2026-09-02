import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { SettingsAccount } from '@/components/settings/SettingsAccount'
import { SettingsPreferences } from '@/components/settings/SettingsPreferences'
import { SettingsSources } from '@/components/settings/SettingsSources'
import { getPhrase } from '@/lib/content'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages traduites. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()

  return {
    title: t('Paramètres'),
    // Écran de réglages : personnel, et sans contenu à référencer.
    robots: { index: false, follow: false },
  }
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
 * en aligne une dizaine ; nous en avons trois, parce que nous n'avons ni notifications
 * à régler, ni limites de transaction, ni vérification d'identité. Trois rubriques
 * pleines valent mieux que dix dont sept annoncent « bientôt ».
 *
 * « Abonnement » EN A DISPARU, avec l'abonnement lui-même : la facturation était
 * adossée au fournisseur d'identité tiers, retiré du site. Il ne reste qu'un jeu de
 * plafonds, identique pour tout le monde (`lib/limits.ts`) ; une rubrique qui
 * annoncerait une offre inexistante serait pire qu'aucune rubrique.
 */

const SECTIONS = [
  { id: 'preferences', label: 'Préférences', hint: 'Langue, devise, thème' },
  { id: 'compte', label: 'Compte', hint: 'Pseudonyme, sessions, suppression' },
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
  const t = await getPhrase()
  const params = await searchParams
  const active = readSection(params['rubrique'])

  return (
    <div className="mx-auto max-w-5xl py-6">
      <header className="mb-8 space-y-2">
        <h1 className="display-xl text-ink">{t("Paramètres")}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{t("Vos réglages d’affichage, votre compte et l’origine des chiffres. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a ici ni moyen de paiement, ni limite de transaction, ni vérification d’identité — et rien à payer, le site n’ayant pas d’offre payante.")}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Colonne de rubriques — de vrais liens, donc navigables au clavier, au
            clic milieu, et indexables par le navigateur dans son historique. */}
        <nav aria-label={t('Rubriques des paramètres')}>
          <ul className="flex gap-1 overflow-x-auto border-b border-border-subtle pb-2 lg:flex-col lg:gap-0 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <Link
                  href={`/parametres?rubrique=${section.id}`}
                  aria-current={active === section.id ? 'page' : undefined}
                  title={t(section.hint)}
                  /* ══════════════════════════════════════════════════════════
                     LA PILULE DE KRAKEN — UN CADRE, PAS UN APLAT

                     Relevé sur leur page de compte : l'entrée active porte une pilule
                     BORDÉE en encre pleine, pas un fond teinté. La différence tient au
                     rôle : un aplat de couleur dit « ceci est signalé », un cadre dit
                     « vous êtes ici ». Sur une barre de navigation où une seule entrée
                     peut être active, c'est la seconde chose qu'il faut dire.

                     `rounded-full` : c'est le pôle « manipulable » de l'échelle à deux
                     pôles du projet, et une entrée de menu se clique. */
                  className={`block whitespace-nowrap rounded-full border px-3.5 py-2 transition-colors duration-150 ${
                    active === section.id
                      ? 'border-border-subtle bg-surface-muted text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <span className="block text-sm font-medium">{t(section.label)}</span>
                  {/* ⚠️ LA PRÉCISION DISPARAÎT DE LA BARRE.

                      Chaque entrée portait une seconde ligne — « Langue, devise,
                      thème » sous « Préférences ». Dans une pilule, deux lignes de
                      hauteurs différentes donnent des pilules de hauteurs différentes,
                      et la colonne cesse d'être une colonne.

                      Elle ne manque pas : le contenu de la rubrique est à droite, et
                      il dit ce qu'elle contient mieux qu'un résumé de trois mots. Elle
                      reste dans le `title`, pour qui hésite avant de cliquer. */}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {active === 'preferences' ? <SettingsPreferences /> : null}
          {active === 'compte' ? <SettingsAccount /> : null}
          {active === 'sources' ? <SettingsSources /> : null}
        </div>
      </div>
    </div>
  )
}
