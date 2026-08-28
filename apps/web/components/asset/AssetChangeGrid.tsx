import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'
import { getPhrase } from '@/lib/content'

/**
 * Variations sur toutes les fenêtres publiées.
 *
 * Les six valeurs arrivent dans la MÊME réponse que le cours : cette rangée ne
 * coûte aucun appel réseau, elle exploite des champs qui étaient jusqu'ici jetés.
 *
 * Les fenêtres absentes sont OMISES et non affichées à zéro — un jeton créé il y a
 * trois mois n'a pas de variation sur un an, et écrire « 0,00 % » laisserait croire
 * à une stabilité parfaite plutôt qu'à une absence (§5).
 */
const WINDOWS: { key: keyof MarketAsset; label: string; longLabel: string }[] = [
  { key: 'change1h', label: '1 h', longLabel: 'sur 1 heure' },
  { key: 'change24h', label: '24 h', longLabel: 'sur 24 heures' },
  { key: 'change7d', label: '7 j', longLabel: 'sur 7 jours' },
  { key: 'change14d', label: '14 j', longLabel: 'sur 14 jours' },
  { key: 'change30d', label: '30 j', longLabel: 'sur 30 jours' },
  { key: 'change1y', label: '1 an', longLabel: 'sur 1 an' },
]

export async function AssetChangeGrid({ asset }: { asset: MarketAsset }) {
  const t = await getPhrase()
  const available = WINDOWS.filter((entry) => typeof asset[entry.key] === 'number')
  if (available.length === 0) return null

  return (
    <section aria-labelledby="variations-titre" className="space-y-2">
      <h2 id="variations-titre" className="sr-only">
        {t('Variations par période')}
      </h2>

      {/*
        ══════════════════════════════════════════════════════════════════════
        UNE LIGNE DE RELEVÉ, ET NON SIX TUILES
        ══════════════════════════════════════════════════════════════════════

        C'était une grille `gap-px` sur fond de bordure : six cellules centrées,
        séparées par des joints d'un pixel obtenus en laissant voir le fond à travers
        les interstices. Le procédé marche et donne exactement ce qu'il décrit — un
        TABLEAU. Six petites boîtes identiques, texte centré, cadre autour de chacune :
        la rangée se lisait comme une feuille de calcul posée sous le graphique.

        Trois choses changent, et chacune retire quelque chose :

        1. LES JOINTS DEVIENNENT DES FILETS. `divide-x` pose un trait entre deux
           colonnes voisines ; le `gap-px` posait un vide qui laissait voir un fond.
           Un trait est une séparation, un vide est une découpe — et six découpes font
           six objets là où il n'y a qu'une mesure déclinée six fois.

        2. LE TEXTE EST ALIGNÉ À GAUCHE. Centré, chaque valeur flotte au milieu de sa
           case et les six chiffres ne s'alignent sur rien. Alignés à gauche, ils
           forment une ligne de lecture — c'est ce que fait toute fiche technique.

        3. L'INTITULÉ PASSE EN CAPITALES ESPACÉES et perd du corps ; la valeur en gagne.
           Ils avaient presque le même poids, si bien que « 24 h » se disputait le regard
           avec « +0,12 % ». La hiérarchie est maintenant celle de la lecture : on cherche
           le chiffre, l'intitulé confirme lequel.

        Sous `sm`, la rangée passe en grille de trois et les filets verticaux
        disparaissent : à six colonnes sur 375 pixels, chaque cellule ferait soixante
        pixels et le pourcentage y serait coupé.
      */}
      <dl className="grid grid-cols-3 overflow-hidden rounded-card border border-border-subtle bg-surface sm:flex sm:divide-x sm:divide-border-subtle">
        {available.map((entry) => (
          <div
            key={entry.key}
            className="flex flex-1 flex-col gap-1.5 border-b border-r border-border-subtle px-4 py-3 last:border-r-0 sm:border-0 sm:border-b-0"
          >
            <dt className="text-[0.625rem] font-medium uppercase tracking-widest text-ink-muted">
              {entry.label}
            </dt>
            <dd className="text-sm">
              <ChangeBadge
                value={asset[entry.key] as number}
                periodLabel={t(entry.longLabel)}
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
