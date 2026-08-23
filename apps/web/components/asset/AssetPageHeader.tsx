import { getTranslations } from 'next-intl/server'

import { getPhrase } from '@/lib/content'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { getCategories } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { AssetBenchmarkRatio } from '@/components/asset/AssetBenchmarkRatio'
import { AssetLogo } from '@/components/asset/AssetLogo'
import { assetName } from '@/components/locale/assetName'
import { AssetMarketStatus } from '@/components/asset/AssetMarketStatus'
import { AssetRangeBar } from '@/components/asset/AssetRangeBar'

/**
 * EN-TÊTE DE FICHE, PLEINE LARGEUR.
 *
 * ── POURQUOI L'IDENTITÉ REMONTE HORS DU RAIL ──────────────────────────────────
 *
 * Elle vivait en tête de la colonne de gauche, avec les chiffres. Le raisonnement
 * d'alors était juste sur un point — le rail met les chiffres à hauteur d'œil, à côté
 * de la courbe — et faux sur un autre : il en a conclu que l'IDENTITÉ devait suivre
 * les chiffres dans la colonne.
 *
 * Or une colonne de 288 pixels impose sa loi à ce qu'on y met. Le nom de l'actif,
 * qui est le `<h1>` de la page, y tenait en 18 pixels — la taille d'un sous-titre de
 * section. Sur la même page, le titre « Toutes les métriques » d'une sous-section de
 * l'onglet Analyse était plus gros que le nom de l'actif. La hiérarchie visuelle
 * disait donc l'inverse de la hiérarchie réelle.
 *
 * La référence pose l'identité EN PLEINE LARGEUR au-dessus de tout, et le rail
 * commence dessous, avec les seuls chiffres. C'est la disposition retenue ici. Le
 * gain de hauteur qui justifiait le rail est préservé : ce bloc-ci ne porte pas la
 * rangée de six chiffres ni les répartitions qui gonflaient l'ancien bandeau — il
 * porte une ligne d'identité, le cours, et rien d'autre.
 *
 * ── CE QUE LE BLOC PORTE, DANS L'ORDRE DE LECTURE ─────────────────────────────
 *
 *   1. Fil d'Ariane et FRAÎCHEUR de la donnée, aux deux bouts d'une même ligne.
 *   2. Logo, nom, code, rang — et l'ÉTOILE DE SUIVI.
 *   3. Cours, variation, cours en actif de référence, amplitude du jour.
 *   4. L'alerte, sous le cours.
 *
 * ── LA RANGÉE DE DEUX BOUTONS A DISPARU ──────────────────────────────
 *
 * « Créer une alerte » et « Suivre » formaient une ligne sous l'identité. Deux boutons
 * bordés de même taille et de même poids, alors qu'ils ne se valent pas : suivre est
 * un geste qu'on répète sur des dizaines d'actifs, armer une alerte se fait une fois
 * et ouvre un formulaire.
 *
 * Le suivi devient donc une ÉTOILE posée contre le rang, là où CoinGecko la met et là
 * où le même geste se trouve déjà dans nos tableaux — un lecteur qui a cliqué une
 * étoile en liste retrouve la même sur la fiche. L'alerte descend sous le cours,
 * puisque c'est un SEUIL DE PRIX qu'elle arme : elle est enfin à côté du nombre
 * qu'elle surveille.
 *
 * La fraîcheur monte ici depuis la barre de méta des onglets, où elle était en gris
 * de 11 pixels sous le mot « Source ». C'est pourtant la réponse à « ce que je lis,
 * de quand date-t-il », question qu'on se pose AVANT de lire le chiffre et pas après.
 *
 * ── AUCUN BOUTON D'ACHAT, ET C'EST STRUCTUREL ─────────────────────────────────
 *
 * Les deux références posent ici « Trade » ou « Add to Portfolio ». Ce site observe
 * et n'exécute rien : l'emplacement revient au suivi et à l'alerte, qui répondent à
 * la même intention — garder un œil — sans rien promettre qu'on ne fait pas.
 */
export async function AssetPageHeader({
  asset,
  assetClass,
  price,
  watchAction,
  alertAction,
  rankLabel,
  breadcrumb,
}: {
  asset: AssetDetail
  assetClass: AssetClass
  /**
   * Le cours, rendu par l'appelant.
   *
   * Il ne peut pas l'être ici : selon la classe d'actif, c'est un composant client
   * branché sur un flux temps réel ou un simple montant converti. Ce bloc sait où
   * poser le prix et à quelle taille, pas d'où il vient.
   */
  price: React.ReactNode
  /** Étoile de suivi, posée contre le rang. Passée en enfant — c'est un composant
      client, que ce bloc serveur peut placer mais pas construire. */
  watchAction: React.ReactNode
  /** Bouton d'alerte, posé sous le cours. Même raison. */
  alertAction: React.ReactNode
  rankLabel: string
  breadcrumb: React.ReactNode
}) {
  const t = await getTranslations('metric')
  const phrase = await getPhrase()
  const isForex = assetClass === 'forex'

  /*
   * ── LES PASTILLES DE CATÉGORIE DEVIENNENT CLIQUABLES ────────────────────
   *
   * Elles ne l'étaient pas, et le motif était bon : la source publie des LIBELLÉS
   * (« Layer 1 (L1) »), jamais les identifiants qu'attend `/categories/[id]`.
   * Fabriquer un lien depuis le texte affiché revenait à deviner une URL, et un lien
   * sur cinq serait tombé sur une page inexistante.
   *
   * Ce qui change ici n'est pas la règle mais la MÉTHODE : on ne devine plus, on
   * RÉSOUT. Le catalogue des secteurs porte le couple (identifiant, nom) ; il suffit
   * de retrouver le libellé dedans. Une pastille sans correspondance reste inerte,
   * exactement comme avant — c'est le cas de toutes celles d'une action ou d'un ETF,
   * dont les secteurs boursiers n'ont pas de page.
   *
   * Le coût réseau est NUL : `getCategories` est déjà en cache pour `/categories` et
   * pour l'onglet Écosystème des fiches crypto, et sa clé ne dépend d'aucun actif.
   */
  const categories = (asset.categories ?? []).slice(0, 3)
  const catalogue = categories.length > 0 ? await getCategories() : null

  const categoryIds = new Map<string, string>()
  if (catalogue?.ok) {
    for (const entry of catalogue.data) categoryIds.set(normalizeLabel(entry.name), entry.id)
  }

  return (

    /*
      ── LE BAS DES DEUX COLONNES EST ALIGNÉ, ET C'EST CE QUI COMBLE LE VIDE ──

      La rangée était en `items-start`. Ses deux colonnes n'ont pas la même hauteur —
      à gauche le nom et ses pastilles, à droite le cours, le ratio de référence,
      l'amplitude et le bouton d'alerte — et l'écart tombait donc SOUS LES PASTILLES,
      en un rectangle vide de trente-huit pixels que rien n'expliquait. Mesuré au
      navigateur sur la fiche du bitcoin.

      `items-end` renvoie cet écart EN HAUT de la colonne gauche, entre le fil
      d'Ariane et le nom. Il y devient de l'air autour d'un titre — ce que l'œil lit
      comme une respiration — au lieu d'un trou sous une rangée d'étiquettes.

      Le fil d'Ariane, lui, garde sa ligne propre au-dessus : il n'entre pas dans
      cette rangée et n'est donc pas déplacé.
    */
    <header className="space-y-3">
      {/*
        ── LA PASTILLE DE FRAÎCHEUR EST RETIRÉE DE L'EN-TÊTE ──────────────────

        Elle annonçait « CoinGecko · 23/08/2026 20:48 » au bout du fil d'Ariane, en
        haut à droite de chaque fiche. C'est la même information que la ligne de source
        sous le graphique, qui la donne au même endroit que la donnée qu'elle qualifie —
        et une provenance annoncée deux fois sur une page se lit comme un doute.

        Le fil d'Ariane reprend donc sa ligne, seul.
      */}
      {breadcrumb}

      {/* ── Identité et cours, sur deux colonnes à partir de `md` ──────────────
          Le nom à gauche, le cours à droite : c'est la disposition de la référence, et
          elle tient parce que les deux blocs se lisent indépendamment. En dessous de
          `md` ils s'empilent, le nom d'abord — sur 375 pixels, un cours posé à côté
          d'un nom long réduirait les deux à des fragments. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-3">
          {/* Le logo dans un disque bordé, et non posé à nu sur le fond : les sources
              livrent des marques aux formes et aux fonds très inégaux — carrées,
              rondes, transparentes, blanches sur blanc. Le disque leur impose à
              toutes la même empreinte. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-surface">
            <AssetLogo asset={asset} size={28} />
          </span>

          <div className="min-w-0">
            {/*
              LE NOM ET LE CODE SUR LA MÊME LIGNE, ce que la colonne étroite interdisait.

              Sur 288 pixels, « Euro / Dollar américain » suivi de sa pastille tenait
              en deux lignes et menaçait de se tronquer. En pleine largeur, la ligne
              porte le nom en 30 pixels, le code en gris à côté, et le rang en
              pastille — exactement la ligne de titre de la référence.
            */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="display-lg leading-none text-ink">
                {assetName(asset.name, assetClass, phrase)}
              </h1>
              <span className="text-lg font-semibold uppercase leading-none tracking-wide text-ink-muted">
                {asset.symbol}
              </span>
              {asset.rank !== undefined ? (
                <span className="tabular rounded-pill border border-border-subtle px-1.5 py-0.5 text-micro font-medium leading-none text-ink-muted">
                  #{asset.rank}
                  {/* Le libellé complet du rang est ACCOLÉ à la pastille : un lecteur
                      d'écran annonce « #1, 1ʳᵉ capitalisation » d'un seul tenant, au
                      lieu d'un dièse isolé. */}
                  <span className="sr-only"> — {rankLabel}</span>
                </span>
              ) : null}

              {/* L'étoile FERME la ligne d'identité, après le rang. Elle est alignée
                  sur la ligne de base des autres éléments et non centrée verticalement
                  sur le titre : dans une ligne où le nom fait trente pixels et le rang
                  onze, un centrage la ferait flotter au milieu de nulle part. */}
              <span className="-my-1.5">{watchAction}</span>
            </div>

            {/* Sous-titre de classement, comme le « Blockchains (L1) » de la référence.
                Trois catégories tiennent ici là où la colonne n'en supportait que deux. */}
            {categories.length > 0 || asset.exchange ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                {asset.exchange ? <span className="font-medium">{asset.exchange}</span> : null}

                {/*
                  ── L'ÉTAT DE LA SÉANCE A REJOINT LA LIGNE D'IDENTITÉ ─────────────

                  Il vivait sous le cours, au motif que c'était une précision SUR LE
                  CHIFFRE — un cours d'action vieux de dix-huit heures un dimanche est
                  parfaitement à jour, et la ligne de fraîcheur en haut de page ne
                  permet pas de le savoir. Le raisonnement tenait.

                  Il tient moins que celui-ci : « Marché fermé » qualifie la PLACE, pas
                  le nombre, et la place est nommée ici. Les deux mentions se
                  répétaient d'ailleurs — le composant réécrivait « NASDAQ » cinquante
                  pixels sous le « NASDAQ » de cette ligne. Rapprochées, elles se lisent
                  d'un trait : « NASDAQ · Marché fermé — ouverture à 15:30 », ce que
                  fait CoinGecko.

                  D'où `showPlace={false}` : le nom est déjà écrit juste avant.
                */}
                <AssetMarketStatus asset={asset} showPlace={false} />
                {categories.map((category) => {
                  const id = categoryIds.get(normalizeLabel(category))

                  /* Deux rendus pour une même pastille, et le survol les distingue :
                     celle qui mène quelque part s'éclaire, l'autre non. Un lien qui ne
                     réagit pas au curseur se lit comme un lien cassé. */
                  return id ? (
                    <Link
                      key={category}
                      href={`/categories/${id}`}
                      className="rounded-pill border border-border-subtle px-2 py-0.5 font-medium transition-colors hover:border-brand hover:text-brand-strong"
                    >
                      {category}
                    </Link>
                  ) : (
                    <span
                      key={category}
                      className="rounded-pill border border-border-subtle px-2 py-0.5 font-medium"
                    >
                      {category}
                    </span>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="figure text-4xl font-bold leading-none text-ink">
              <span className="sr-only">{t('price.label')} : </span>
              {price}
            </p>
            {asset.change24h !== undefined ? (
              <span className="tabular text-base font-semibold leading-none">
                {/* `showPeriod` : sur une fiche, le pourcentage est seul à côté du cours
                    et rien ne dit sur quelle durée il porte. Voir la note de la
                    propriété. */}
                <ChangeBadge
                  value={asset.change24h}
                  periodLabel={asset.changePeriodLabel}
                  showPeriod
                />
              </span>
            ) : null}
          </div>

          {/* Cours en actif de référence — voir son en-tête. Absent hors crypto. */}
          <AssetBenchmarkRatio asset={asset} />

          {/*
            ── L'AMPLITUDE ET L'ALERTE PARTAGENT UNE LIGNE ────────────────────

            Elles en occupaient deux, empilées. Le bouton d'alerte prenait donc à lui
            seul une rangée de 40 pixels dans une colonne déjà plus haute que sa
            voisine — et c'est cette différence de hauteur qui creusait le vide sous les
            pastilles de catégorie, mesuré à 72 pixels sur la fiche Hyperliquid.

            Les réunir tient parce qu'elles disent la même chose : la barre montre entre
            quelles bornes le cours a évolué aujourd'hui, le bouton arme un seuil DANS
            ces bornes. C'est même le rapprochement qui rend le geste évident — on voit
            l'intervalle, puis le bouton qui le surveille, sans quitter la ligne.

            `items-end` : la barre porte ses deux bornes chiffrées sous elle, le bouton
            n'a rien dessous. Alignés par le haut, le bouton flotterait au-dessus du
            vide laissé par ces chiffres.

            La ligne se replie sous `sm`, où 384 pixels de barre et un bouton ne tiennent
            pas côte à côte — et où la colonne est de toute façon seule sur sa ligne.
          */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="min-w-0 max-w-sm flex-1">
              <AssetRangeBar asset={asset} isRate={isForex} />
            </div>
            <div className="shrink-0">{alertAction}</div>
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * Forme de comparaison d'un libellé de secteur.
 *
 * Le libellé porté par un actif et celui du catalogue décrivent le même secteur sans
 * toujours s'écrire pareil : capitales, accents, tirets, espaces autour d'une
 * parenthèse. Une comparaison littérale raterait donc des correspondances réelles —
 * et rater une correspondance, ici, veut dire laisser une pastille inerte alors
 * qu'une page l'attend.
 *
 * On ramène les deux à des lettres et des chiffres minuscules, sans accent. Ce qui
 * reste écarté, ce sont les vraies divergences de NOM, et c'est le comportement
 * voulu : mieux vaut une pastille muette qu'un lien vers le mauvais secteur.
 */
function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
