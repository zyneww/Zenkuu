import { getTranslations } from 'next-intl/server'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { AssetRangeBar } from '@/components/asset/AssetRangeBar'

/**
 * Tête du rail de gauche — identité, cours, amplitude, actions.
 *
 * ── POURQUOI CE BLOC EXISTE, ET CE QU'IL REMPLACE ─────────────────────────────
 *
 * La fiche portait jusqu'ici ces quatre choses dans un BANDEAU PLEINE LARGEUR posé
 * au-dessus de tout : logo et nom à gauche, boutons à droite, puis une rangée
 * horizontale de six chiffres, puis la barre d'amplitude sur toute la largeur.
 *
 * Ce n'est pas la disposition de la référence, et l'écart n'est pas cosmétique. Chez
 * elle, tout ce qui IDENTIFIE et tout ce qui CHIFFRE tient dans une colonne étroite,
 * à gauche, à côté du graphique — pas au-dessus. La différence se paie en hauteur :
 * un bandeau pleine largeur, plus une barre d'amplitude, plus une rangée d'onglets
 * consomment près de trois cents pixels avant que la courbe ne commence. Dans un
 * rail, les mêmes informations sont à hauteur d'œil À CÔTÉ de la courbe, et le
 * premier écran montre les deux.
 *
 * Le rail a une seconde propriété, plus importante encore : il vit HORS des onglets.
 * Le cours et la capitalisation restent donc lisibles pendant qu'on parcourt les
 * places de cotation ou l'historique, là où le bandeau, lui, était certes toujours
 * là — mais poussait tout le reste vers le bas.
 *
 * ── L'ORDRE DE LECTURE ────────────────────────────────────────────────────────
 *
 * Qui · combien · dans quelle fourchette · qu'est-ce que j'en fais. C'est celui de la
 * référence, et il suit la question que se pose un lecteur qui arrive d'un moteur de
 * recherche. Les statistiques détaillées viennent APRÈS les actions, sous ce bloc :
 * ce sont des réponses de second tour.
 */
export async function AssetRailIdentity({
  asset,
  assetClass,
  price,
  actions,
  rankLabel,
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
  /** Alerte et suivi. Passés en enfant pour la même raison que le prix. */
  actions: React.ReactNode
  rankLabel: string
}) {
  const t = await getTranslations('metric')
  const isForex = assetClass === 'forex'
  const categories = (asset.categories ?? []).slice(0, 2)

  return (
    <section className="space-y-4 rounded-card border border-border-subtle bg-panel p-4">
      {/* ── Qui ─────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          {/* Le logo dans un disque bordé, et non posé à nu sur le fond : les sources
              livrent des marques aux formes et aux fonds très inégaux — carrées,
              rondes, transparentes, blanches sur blanc. Le disque leur impose à
              toutes la même empreinte. */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-surface">
            <AssetLogo asset={asset} size={20} />
          </span>

          {/*
            LE NOM PASSE À LA LIGNE PLUTÔT QUE D'ÊTRE TRONQUÉ, et les codes descendent
            sous lui.

            Sur une seule ligne avec le symbole et le rang, une colonne de 288 pixels
            ne laissait qu'une centaine de pixels au nom : « Euro / Dollar a… »,
            constaté à l'écran sur les paires de devises, dont les libellés sont les
            plus longs du site. Or c'est le `<h1>` de la page — le tronquer efface
            l'information la plus importante du bloc pour préserver deux pastilles.

            La troncature était d'ailleurs purement visuelle : le texte complet restait
            dans le document, donc lisible par un moteur de recherche mais pas par le
            lecteur. C'est l'inverse de ce qu'on veut.
          */}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight text-ink">
              {asset.name}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {/* Le symbole en PASTILLE : SOL, HYPE ou CAC40 sont des CODES, pas des
                  mots. Une capitale grise se lit comme la suite du nom. */}
              <span className="rounded-pill bg-surface-muted px-1.5 py-0.5 text-micro font-semibold uppercase leading-none tracking-wider text-ink-muted">
                {asset.symbol}
              </span>

              {asset.rank !== undefined ? (
                <span className="tabular rounded-pill border border-border-subtle px-1.5 py-0.5 text-micro font-medium leading-none text-ink-muted">
                  #{asset.rank}
                  {/* Le libellé complet du rang est ACCOLÉ à la pastille, et non
                      relégué en fin de section. Un lecteur d'écran annonce ainsi
                      « #10, 10ᵉ capitalisation » d'un seul tenant, au lieu de lire un
                      dièse isolé puis, trois blocs plus loin, une phrase qui s'y
                      rapportait sans que rien ne le dise. */}
                  <span className="sr-only"> — {rankLabel}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Deux catégories au plus, et non trois comme dans l'ancien bandeau : la
            colonne fait 288 pixels, où trois étiquettes passent à la ligne et
            repoussent le cours d'un cran. */}
        {categories.length > 0 || asset.exchange ? (
          <div className="flex flex-wrap items-center gap-1 text-micro text-ink-muted">
            {asset.exchange ? <span className="font-medium">{asset.exchange}</span> : null}
            {categories.map((category) => (
              <span
                key={category}
                className="rounded-pill border border-border-subtle px-1.5 py-0.5 font-medium"
              >
                {category}
              </span>
            ))}
          </div>
        ) : null}

      </div>

      {/* ── Combien ─────────────────────────────────────────────────────────────
          Le cours retrouve ici le grand corps qu'il avait perdu en passant dans un
          bandeau horizontal. Dans une rangée de six chiffres, il fallait le rabaisser
          pour qu'il n'écrase pas ses voisins ; seul en tête d'une colonne, il n'écrase
          plus rien et redevient ce qu'il est — la porte d'entrée de la page. */}
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <p className="tabular text-3xl font-bold leading-none text-ink">
          <span className="sr-only">{t('price.label')} : </span>
          {price}
        </p>
        {asset.change24h !== undefined ? (
          <span className="tabular text-sm font-semibold leading-none">
            <ChangeBadge value={asset.change24h} periodLabel={asset.changePeriodLabel} />
          </span>
        ) : null}
      </div>

      {/* ── Dans quelle fourchette ────────────────────────────────────────────
          Accolée au cours, et l'endroit est dicté par la lecture et non par le
          style : un curseur ne situe rien s'il est éloigné du chiffre qu'il situe.
          `sr-only` sur le libellé — la barre porte déjà ses deux bornes chiffrées. */}
      <div>
        <AssetRangeBar asset={asset} isRate={isForex} />
      </div>

      {/* ── Qu'est-ce que j'en fais ──────────────────────────────────────────
          Pleine largeur de la colonne. La référence pose au même endroit son
          « Add to Portfolio » et sa cloche d'alerte, et pour la même raison : ce sont
          les seules actions de la page, elles n'ont pas à se disputer une place. */}
      {/*
        DERNIER ENFANT, ET CE N'EST PAS UN DÉTAIL DE RANGEMENT.

        Un `<p class="sr-only">` fermait cette section. Invisible et hors flux, il ne
        prenait aucune hauteur — mais il faisait de la rangée de boutons un enfant
        « non dernier », à qui `space-y-4` accorde donc une marge basse de 16 pixels.
        Ajoutée aux 16 du `p-4`, elle creusait sous les boutons un vide que rien ne
        justifiait et que rien n'expliquait en lisant le balisage.

        Le libellé a rejoint le cours qu'il décrit, ce qui règle les deux problèmes
        d'un coup : la marge fantôme disparaît, et un lecteur d'écran entend enfin
        « Prix : 56,92 $US » au lieu du mot « Prix » lâché en fin de carte.
      */}
      <div className="flex flex-wrap gap-2 [&>*]:flex-1">{actions}</div>
    </section>
  )
}
