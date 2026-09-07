import type { AssetClass, AssetProfile, AssetTicker } from '@zenkuu/data'

import { ShareDonut, type SharePart } from '@/components/asset/ShareDonut'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES RÉPARTITIONS — LA GRILLE DU BAS, D'APRÈS TOKEN TERMINAL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE LA RÉFÉRENCE MET LÀ, ET CE QUE NOUS POUVONS Y METTRE ──────────────
 *
 * `tokenterminal.com/explorer/projects/hyperliquid` remplit sa moitié basse d'une
 * grille de deux colonnes : « Notional trading volume by chain », « …by version »,
 * chaque jeu rendu DEUX FOIS — en barres à gauche, en anneau à droite, avec une
 * légende « nom · % » collée à l'anneau.
 *
 * Ses deux découpes — la chaîne, la version du protocole — n'existent pas ici :
 * `AssetDetail.contracts` associe une chaîne à une ADRESSE, sans aucun poids, et
 * aucune source branchée sur ce site ne versionne un protocole. Les reprendre
 * demanderait d'inventer les pondérations, ce que le §5 interdit.
 *
 * Les découpes retenues sont celles dont NOUS avons la mesure, et elles ne coûtent
 * AUCUN appel réseau de plus — les trois jeux sont déjà chargés par la fiche :
 *
 *     crypto   volume 24 h par PLACE DE COTATION      ← `tickers`, déjà lu
 *     crypto   volume 24 h par CONTREPARTIE           ← le même tableau, autre clé
 *     action   répartition du CAPITAL                 ← `profile.ownership`, déjà lu
 *
 * ── ⚠️ TROIS RÉPARTITIONS POSSIBLES ONT ÉTÉ ÉCARTÉES, ET CE N'EST PAS UN OUBLI ─
 *
 * L'OFFRE (en circulation contre reste à émettre) est mesurable et n'est pas ici :
 * `AssetSupply` la rend DÉJÀ dans le rail, en jauges, à trois centimètres de là. Un
 * anneau à deux parts qui redit une jauge n'ajoute pas une lecture, il en duplique
 * une — et c'est exactement le défaut qui avait fait retirer la grille de repères de
 * l'accueil.
 *
 * LES SECTEURS ET LES DÉTENTIONS D'UN FONDS ne sont pas ici non plus, et pour la
 * raison inverse : `AssetHoldings` les rend déjà, avec ses barres, son anneau et sa
 * table de pondérations. La fiche l'appelle directement pour les ETF. Le recopier ici
 * ferait deux composants pour une seule donnée.
 *
 * LA DIVISION PAR CHAÎNE d'une cryptomonnaie multi-contrats a été essayée puis
 * abandonnée : `contracts` est un `Record<chaîne, adresse>`. Compter les chaînes
 * donnerait des parts ÉGALES — un jeton présent sur six réseaux afficherait six fois
 * 16,7 %, ce qui ressemble à une mesure et n'en est pas une.
 *
 * ── POURQUOI `ShareDonut` ET PAS UNE FIGURE NEUVE ───────────────────────────
 *
 * Il porte déjà l'anneau, la légende « nom · % », la colonne de valeurs facultative,
 * l'agrégat « Autres · N » au-delà de six parts et le retrait automatique sous deux
 * parts utilisables. Sa propre note le dit : « une répartition est une répartition ;
 * en écrire une seconde donnerait deux anneaux qui divergeraient à la première
 * retouche. » La grille se contente donc de le poser deux fois côte à côte.
 *
 * Les BARRES de la référence ne sont pas reprises : elles disent la même chose que
 * l'anneau qu'elles jouxtent, et le cahier des charges les demande « ET/OU ». À deux
 * cartes par rangée, doubler chaque jeu en ferait quatre pour deux mesures.
 */
export async function AssetDistributions({
  assetClass,
  tickers,
  profile,
  currency,
}: {
  assetClass: AssetClass
  /** Cotations par place, déjà chargées par la fiche pour `AssetExchangeTable`. */
  tickers: AssetTicker[]
  /** Profil boursier, déjà chargé pour le rail. `null` hors bourse. */
  profile: AssetProfile | null
  /** Devise des volumes, pour la colonne de valeurs de l'anneau. */
  currency: string
}) {
  const t = await getPhrase()

  const cards: React.ReactNode[] = []

  if (assetClass === 'crypto') {
    /* ⚠️ LE FILTRE SUR `volume24h` PRÉCÈDE LE REGROUPEMENT, et il n'est pas
       décoratif : la source ne publie pas ce champ sur toutes les paires, et une
       ligne sans volume vaudrait `undefined` dans la somme — ce qui ne donne pas
       zéro mais `NaN`, et emporte toute la part avec elle. */
    const parPlace = sommerPar(tickers, (row) => row.exchange)
    const parContrepartie = sommerPar(tickers, (row) => row.target)

    if (parPlace.length > 0) {
      cards.push(
        <ShareDonut
          key="places"
          title={t('Volume par place de cotation')}
          subtitle={t('Sur 24 heures, d’après les paires cotées que la source publie')}
          parts={parPlace}
          restNoun={t('places')}
          valueCurrency={currency}
          valueHeader={t('Volume 24 h')}
        />,
      )
    }

    if (parContrepartie.length > 0) {
      cards.push(
        <ShareDonut
          key="contreparties"
          title={t('Volume par contrepartie')}
          /* « Contrepartie » et non « paire » : la clé regroupée est le SECOND terme
             de la paire — l'unité contre laquelle l'actif s'échange. Écrire « paire »
             ferait attendre « BTC/USDT » là où la légende affiche « USDT ». */
          subtitle={t('Sur 24 heures, par unité contre laquelle l’actif s’échange')}
          parts={parContrepartie}
          restNoun={t('contreparties')}
          valueCurrency={currency}
          valueHeader={t('Volume 24 h')}
        />,
      )
    }
  }

  /*
   * ── LE CAPITAL D'UNE ACTION — LA MEILLEURE DONNÉE INUTILISÉE DU DÉPÔT ───────
   *
   * `profile.ownership` arrive dans le MÊME appel que les ratios boursiers déjà
   * affichés par `AssetProfileRail` : elle est payée depuis le début et n'était lue
   * nulle part.
   *
   * ⚠️ ELLE VIENT DE DÉCLARATIONS TRIMESTRIELLES, donc datées — le type le dit en
   * toutes lettres. Le sous-titre le répète à l'écran plutôt que de laisser croire à
   * un relevé du jour.
   *
   * LE FLOTTANT EST UN RESTE, ET IL EST CALCULÉ ICI : la source publie la part des
   * initiés et celle des institutions, jamais la troisième. `100 − les deux` est une
   * soustraction entre deux nombres publiés, pas une estimation — et elle est bornée
   * à zéro, parce que deux déclarations arrondies peuvent dépasser cent ensemble.
   */
  const capital = profile?.ownership
  if (capital) {
    const inities = capital.insidersPercent
    const institutions = capital.institutionsPercent
    const parts: SharePart[] = []

    if (inities !== undefined && inities > 0) {
      parts.push({ label: t('Initiés'), value: inities })
    }
    if (institutions !== undefined && institutions > 0) {
      parts.push({ label: t('Institutions'), value: institutions })
    }

    if (parts.length > 0) {
      const declare = parts.reduce((somme, part) => somme + part.value, 0)
      const reste = Math.max(100 - declare, 0)
      /* ⚠️ « AUTRES DÉTENTEURS » ET NON « FLOTTANT ». Le flottant désigne les titres
         DISPONIBLES à la négociation, ce qui inclut l'essentiel des positions
         institutionnelles : l'appeler ainsi ferait de cette part le complément de ce
         qu'elle recouvre déjà. Ce reste est simplement ce que les deux déclarations
         ne couvrent pas — particuliers et détenteurs non déclarants. */
      if (reste > 0) parts.push({ label: t('Autres détenteurs'), value: reste })

      cards.push(
        <ShareDonut
          key="capital"
          title={t('Répartition du capital')}
          subtitle={
            capital.institutionsCount !== undefined
              ? t('D’après {n} déclarations réglementaires trimestrielles').replace(
                  '{n}',
                  String(capital.institutionsCount),
                )
              : t('D’après les déclarations réglementaires trimestrielles')
          }
          parts={parts}
          restNoun={t('catégories')}
        />,
      )
    }

    /* Les premiers porteurs déclarés font une SECONDE répartition, et non une
       colonne de plus dans la première : ils découpent la part institutionnelle,
       pas le capital entier. Les mêler donnerait un anneau dont les parts ne se
       comparent pas. */
    const porteurs = (capital.topInstitutions ?? [])
      .filter((holder) => holder.percentHeld !== undefined && holder.percentHeld > 0)
      .map((holder) => ({ label: holder.name, value: holder.percentHeld as number }))

    if (porteurs.length > 1) {
      cards.push(
        <ShareDonut
          key="porteurs"
          title={t('Premiers porteurs institutionnels')}
          /* ⚠️ CE SOUS-TITRE A DIT LE CONTRAIRE, ET C'ÉTAIT UN MENSONGE DE LÉGENDE.
             Il annonçait « part du capital déclarée par chacun ». `ShareDonut`
             NORMALISE ses parts à cent : sur la fiche Apple, Blackrock y paraissait
             à 25 % alors que la source le déclare à un peu moins de 7 % du capital.
             Le nombre affiché est un poids DANS CE GROUPE, et la légende doit le
             dire — sans quoi elle multiplie par quatre la position du premier
             porteur d'une des plus grosses capitalisations du monde. */
          subtitle={t('Poids de chacun au sein de ce groupe, et non part du capital total')}
          parts={porteurs}
          restNoun={t('porteurs')}
        />,
      )
    }
  }

  /* Aucune carte : la section ne se rend pas du tout. Un titre suivi de rien se lit
     comme une panne, et c'est l'état NORMAL d'une paire de devises ou d'un indice —
     ni places de cotation, ni capital déclaré. */
  if (cards.length === 0) return null

  return (
    <section className="asset-section space-y-4">
      <div className="space-y-1">
        <h2 className="display-sm text-ink">{t('Répartitions')}</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          {t(
            'Comment le volume et le capital se répartissent réellement, d’après les seules découpes que nos sources publient avec leurs poids.',
          )}
        </p>
      </div>

      {/* Deux colonnes à partir de `lg`, comme la référence. Une seule carte occupe
          alors la moitié gauche plutôt que de s'étirer : un anneau de six cents pixels
          de large met sa légende à un demi-écran de sa figure. */}
      <div className="grid gap-4 lg:grid-cols-2">{cards}</div>
    </section>
  )
}

/**
 * Somme des volumes 24 h par clé, du plus gros au plus petit.
 *
 * Renvoie un tableau VIDE plutôt que des parts nulles quand aucune ligne ne porte de
 * volume — c'est le cas d'une cryptomonnaie que la source ne suit sur aucune place, et
 * `ShareDonut` se retirerait de lui-même, mais il faut aussi que la CARTE disparaisse.
 */
function sommerPar(rows: AssetTicker[], cle: (row: AssetTicker) => string): SharePart[] {
  const totaux = new Map<string, number>()

  for (const row of rows) {
    if (row.volume24h === undefined) continue
    const nom = cle(row)
    if (!nom) continue
    totaux.set(nom, (totaux.get(nom) ?? 0) + row.volume24h)
  }

  return [...totaux.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((part) => part.value > 0)
    .sort((a, b) => b.value - a.value)
}
