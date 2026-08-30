import type { ComponentType } from 'react'

import { getLocale, getTranslations } from 'next-intl/server'

import { ChevronDown, Code, Compass, FileText, Globe, MessageCircle, Send, Users } from 'lucide-react'

import { XGlyph } from '@/components/BrandIcons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { getPhrase } from '@/lib/content'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { getCategories } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { AssetBenchmarkRatio } from '@/components/asset/AssetBenchmarkRatio'
import { AssetLogo } from '@/components/asset/AssetLogo'
import { assetName } from '@/components/locale/assetName'
import { AssetMarketStatus } from '@/components/asset/AssetMarketStatus'
import { Money } from '@/components/locale/Money'
import { AssetRangeBar } from '@/components/asset/AssetRangeBar'

/**
 * Pictogramme par réseau, sur les clés que le fournisseur écrit réellement.
 *
 * Elles sont fixées côté source — « Reddit », « X », « Telegram », « Forum » (voir
 * `coingecko.ts`) — et volontairement peu nombreuses. Une clé inconnue retombe sur
 * la bulle générique : c'est le comportement voulu le jour où la source en ajoute
 * une, plutôt qu'une case vide ou une icône fausse.
 *
 * ⚠️ `lucide` A RETIRÉ SES LOGOS DE MARQUE, et les quatre destinations ne peuvent
 * donc pas être servies de la même façon. X a le sien, tracé dans `BrandIcons` —
 * c'est le lien que la référence met en avant, et quatre bulles identiques dans une
 * rangée de sept icônes ne distinguent rien. Les trois autres prennent le
 * pictogramme qui décrit leur NATURE : l'avion en papier de Telegram, la bulle de
 * Reddit, le groupe d'un forum.
 *
 * Le nom exact reste porté par `aria-label` et par l'infobulle dans tous les cas.
 */
/* `ComponentType<{ className?: string }>` et non `typeof Globe` : les icônes de
   `lucide` sont des `forwardRef`, notre glyphe X une fonction ordinaire. Le type le
   plus étroit — celui d'une icône lucide — exclurait le second, et c'est précisément
   celui qu'on veut ici. Seule compte la prop réellement passée : `className`. */
type LinkIcon = ComponentType<{ className?: string }>

const COMMUNITY_ICONS: Record<string, LinkIcon> = {
  Telegram: Send,
  Reddit: MessageCircle,
  X: XGlyph,
  Forum: Users,
}

/**
 * Liens montrés en pastille ; au-delà, le suivant est une flèche qui ouvre le reste.
 *
 * TROIS, et le nombre se déduit de ce que la rangée porte DÉJÀ : le nom de la place,
 * l'état de la séance et jusqu'à trois étiquettes de secteur précèdent les liens sur
 * la même ligne. Une grande cryptomonnaie en publie sept — site, X, Reddit, Telegram,
 * deux explorateurs, livre blanc, code — et sept pastilles identiques ajoutées à la
 * suite faisaient passer la ligne à la suivante, où elles se lisaient comme une barre
 * d'outils orpheline sous le nom de l'actif.
 *
 * Trois tiennent partout, y compris sur téléphone, et ce sont les trois qui comptent :
 * l'ordre de construction met le site officiel en tête, puis les réseaux. Le reste
 * n'est pas caché, il est REPLIÉ — la flèche dit qu'il y a autre chose, et le menu le
 * nomme en toutes lettres là où la pastille n'avait qu'une infobulle.
 */
const VISIBLE_LINKS = 3

/** Nom d'hôte d'une URL, pour libeller un lien sans afficher l'URL entière. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

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
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ CE BLOC N'EST PLUS UNE RANGÉE À LUI — IL EN OCCUPE UNE, AVEC LES ONGLETS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Il formait un `<header>` complet : fil d'Ariane, puis une rangée à deux colonnes —
 * l'identité à gauche, le cours à droite. La barre de sommaire venait DESSOUS, sur sa
 * propre ligne, où quatre onglets centrés laissaient plusieurs centaines de pixels de
 * vide de chaque côté.
 *
 * Les deux rangées n'en font plus qu'une : identité à gauche, onglets au centre, cours
 * à droite. Le vide latéral du sommaire est comblé par ce qui occupait la rangée
 * précédente, et la fiche gagne toute la hauteur de celle-ci.
 *
 * Ce fichier n'exporte donc plus un en-tête mais ses DEUX MOITIÉS, que
 * `AssetLayoutFrame` place aux deux bouts de sa rangée collante. Le fil d'Ariane, lui,
 * garde sa ligne propre au-dessus et est rendu par l'appelant : il ne défile pas avec
 * la rangée et n'a rien à faire dedans.
 *
 * ── POURQUOI DEUX COMPOSANTS ET NON UN AVEC DEUX EMPLACEMENTS ────────────────
 *
 * Parce que la rangée les sépare par les onglets, qui sont un composant CLIENT. Un
 * bloc serveur unique ne peut pas s'enrouler autour de lui ; deux blocs serveurs
 * passés en nœuds, si.
 */
export async function AssetHeadline({
  asset,
  assetClass,
  watchAction,
  rankLabel,
}: {
  asset: AssetDetail
  assetClass: AssetClass
  /** Étoile de suivi, posée contre le rang. Passée en enfant — c'est un composant
      client, que ce bloc serveur peut placer mais pas construire. */
  watchAction: React.ReactNode
  rankLabel: string
}) {
  const phrase = await getPhrase()

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

  /*
   * ── LES LIENS OFFICIELS, RASSEMBLÉS EN UNE RANGÉE D'ICÔNES ────────────────
   *
   * C'est la zone noire de la référence (dropstab.com) : site officiel, réseaux,
   * explorateurs, livre blanc, code source — une pastille par destination, à la
   * suite des étiquettes de secteur.
   *
   * ⚠️ ON NE FABRIQUE AUCUN LIEN. Chaque entrée vient d'un champ RENSEIGNÉ par la
   * source : `homepageUrl`, `communityUrls` (dont les clés sont « X », « Reddit »,
   * « Telegram », « Forum » — voir le fournisseur), `explorerUrls`, `whitepaperUrl`
   * et `sourceCodeUrl`. La référence montre un bouton Discord ; aucune de nos
   * sources ne publie ce lien, il n'y a donc pas de bouton Discord. Une icône vers
   * un réseau où le projet n'a pas de compte serait une donnée inventée.
   *
   * Les explorateurs sont bornés à DEUX : la source en livre jusqu'à six, tous
   * équivalents, et six pastilles identiques dans une ligne d'identité se lisent
   * comme un défaut d'affichage.
   */
  const links: { key: string; href: string; label: string; icon: LinkIcon }[] = []

  if (asset.homepageUrl) {
    links.push({ key: 'site', href: asset.homepageUrl, label: 'Site officiel', icon: Globe })
  }

  for (const [label, href] of Object.entries(asset.communityUrls ?? {})) {
    links.push({ key: `social-${label}`, href, label, icon: COMMUNITY_ICONS[label] ?? MessageCircle })
  }

  for (const [index, href] of (asset.explorerUrls ?? []).slice(0, 2).entries()) {
    links.push({
      key: `explorateur-${index}`,
      href,
      label: `Explorateur — ${hostLabel(href)}`,
      icon: Compass,
    })
  }

  if (asset.whitepaperUrl) {
    links.push({ key: 'livre-blanc', href: asset.whitepaperUrl, label: 'Livre blanc', icon: FileText })
  }

  if (asset.sourceCodeUrl) {
    links.push({ key: 'code', href: asset.sourceCodeUrl, label: 'Code source', icon: Code })
  }

  return (
        <div className="flex min-w-0 items-start gap-3">
          {/*
            ── L'ÉTOILE OUVRE LA LIGNE, ELLE NE LA FERME PLUS ──────────────────

            Elle fermait la ligne de titre, après le symbole. Deux raisons de la
            déplacer contre le logo, dans cet ordre :

            C'est la place de la référence (zone verte de dropstab.com), et cette
            place a une logique : suivre un actif est une action sur L'OBJET, pas sur
            son nom. Posée avant le logo, elle se lit comme la case à cocher d'une
            ligne de liste — ce qu'elle est.

            Et la ligne de titre y gagne : sur un nom long — « Wrapped liquid staked
            Ether 2.0 » — l'étoile passait à la ligne et entraînait le sous-titre de
            catégories avec elle.

            `mt-2.5` la centre optiquement sur le disque du logo sans la lier à sa
            hauteur : les deux sont alignés en haut du bloc, pas sur son milieu, parce
            que le bloc de droite grandit avec le nombre d'étiquettes.
          */}
          <span className="mt-2.5 shrink-0">{watchAction}</span>

          {/* Le logo dans un disque bordé, et non posé à nu sur le fond : les sources
              livrent des marques aux formes et aux fonds très inégaux — carrées,
              rondes, transparentes, blanches sur blanc. Le disque leur impose à
              toutes la même empreinte. */}
          {/*
            ── LE RANG EST ACCROCHÉ SOUS LE LOGO ─────────────────────────────

            Il fermait la ligne de titre, en pastille, entre le symbole et l'étoile.
            Il en part pour la place qu'il occupe chez CoinMarketCap : une pastille
            accrochée au BAS du disque, à cheval sur son bord.

            Ce n'est pas qu'un déplacement. Le rang qualifie l'ACTIF, pas son nom —
            posé dans la ligne de titre, il s'intercalait entre deux éléments
            typographiques (le nom en 30 px, le symbole en 18) et cassait leur
            rapport ; accroché au logo, il se lit comme une propriété de l'objet,
            de la même façon qu'un numéro sur un maillot.

            `overflow-visible` n'est pas déclaré et ne doit pas l'être : la pastille
            dépasse du disque, et un `overflow-hidden` posé un jour sur un ancêtre la
            trancherait en deux. Aucun n'existe aujourd'hui sur ce chemin.
          */}
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-surface">
            <AssetLogo asset={asset} size={28} />

            {asset.rank !== undefined ? (
              /* `bg-canvas` et non `bg-surface` : la pastille chevauche le bord du
                 disque, qui est lui-même en `bg-surface`. Deux fonds identiques
                 feraient disparaître la découpe, et la pastille se lirait comme une
                 excroissance du disque plutôt que comme une étiquette posée dessus. */
              <span className="tabular absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill border border-border-subtle bg-canvas px-1.5 py-[0.1875rem] text-micro font-semibold leading-none text-ink-muted">
                #{asset.rank}
                {/* Le libellé complet du rang est ACCOLÉ à la pastille : un lecteur
                    d'écran annonce « #1, 1ʳᵉ capitalisation » d'un seul tenant, au
                    lieu d'un dièse isolé. */}
                <span className="sr-only"> — {rankLabel}</span>
              </span>
            ) : null}
          </span>

          <div className="min-w-0">
            {/*
              LE NOM ET LE CODE SUR LA MÊME LIGNE, ce que la colonne étroite interdisait.

              Sur 288 pixels, « Euro / Dollar américain » suivi de sa pastille tenait
              en deux lignes et menaçait de se tronquer. En pleine largeur, la ligne
              porte les deux.

              ── ⚠️ LE NOM PASSE DE 36 PX À 18, ET C'EST UNE INVERSION DE HIÉRARCHIE ──

              Cette note disait « le nom en 30 pixels [...] exactement la ligne de
              titre de la référence ». Le relevé du 2026-08-30 sur
              `coingecko.com/en/coins/bitcoin` dit l'inverse :

                  Bitcoin        18 px / 700   encre
                  BTC Price      14 px / 400   encre atténuée
                  #1             12 px / 500   encre atténuée
                  $78,707.13     36 px / 700   encre        ← le plus gros de la page
                  0.7% (24h)     18 px / 700   vert

              C'est le COURS qui porte les 36 px, pas le nom. ZENKUU faisait
              exactement l'inverse — nom à 36, cours à 14 — et l'écart n'est pas
              cosmétique : sur une page où l'on vient chercher un prix, le nom de
              l'actif est déjà connu du lecteur, qui l'a saisi ou cliqué pour arriver
              là. Le mettre deux fois plus gros que le chiffre qu'on cherche inverse
              la raison de la visite.

              `text-lg` (18 px) plutôt qu'un cran `display-*` : ces crans portent une
              famille d'affichage et un interlettrage négatif que la référence
              n'applique à aucun de ses textes.
            */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="text-lg font-bold leading-none text-ink">
                {assetName(asset.name, assetClass, phrase)}
              </h1>
              <span className="text-sm font-normal uppercase leading-none text-ink-muted">
                {asset.symbol}
              </span>
              {/* Ni le rang ni l'étoile ne sont ICI : le premier est accroché au bas du
                  logo, la seconde ouvre la rangée. Voir les deux notes ci-dessus. */}
            </div>

            {/* Sous-titre de classement, comme le « Blockchains (L1) » de la référence,
                suivi des liens officiels. */}
            {categories.length > 0 || asset.exchange || links.length > 0 ? (
              /*
                ── UNE SEULE LIGNE, ET CE QUI DÉBORDE PASSE À LA SUIVANTE ───────

                Elle était `flex-nowrap overflow-hidden` : les pastilles qui ne
                tenaient pas étaient coupées au bord, pour figer la hauteur de la
                rangée — contrainte réelle tant que l'en-tête partageait sa hauteur
                mesurée avec la barre de sommaire et le bloc de cours.

                Cette contrainte est levée : l'en-tête est redevenu une rangée
                ordinaire du flux (voir `AssetPageView`), qui peut grandir d'une
                ligne sans rien décaler. Les étiquettes et les liens retournent donc
                à la ligne au lieu d'être tranchés, ce qui est le bon comportement
                dès qu'on ne paie plus la hauteur.
              */
              <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                {asset.exchange ? <span className="font-medium">{asset.exchange}</span> : null}

                {/*
                  ── L'ÉTAT DE LA SÉANCE EST DANS LA LIGNE D'IDENTITÉ ─────────────

                  « Marché fermé » qualifie la PLACE, pas le nombre, et la place est
                  nommée ici. Les deux mentions se répétaient d'ailleurs — le composant
                  réécrivait « NASDAQ » cinquante pixels sous le « NASDAQ » de cette
                  ligne. Rapprochées, elles se lisent d'un trait : « NASDAQ · Marché
                  fermé — ouverture à 15:30 », ce que fait CoinGecko.

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
                      className="min-w-0 truncate rounded-pill border border-border-subtle px-2 py-0.5 font-medium transition-colors hover:border-brand hover:text-brand"
                    >
                      {category}
                    </Link>
                  ) : (
                    <span
                      key={category}
                      className="min-w-0 truncate rounded-pill border border-border-subtle px-2 py-0.5 font-medium"
                    >
                      {category}
                    </span>
                  )
                })}

                {/* Les liens ferment la ligne, séparés des étiquettes par un filet
                    vertical : ce sont deux natures différentes — les unes classent,
                    les autres emmènent ailleurs — et sans séparation la rangée se lit
                    comme une seule suite de pastilles. */}
                {links.length > 0 ? (
                  <>
                    {categories.length > 0 || asset.exchange ? (
                      <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border-subtle" />
                    ) : null}

                    <ul className="flex flex-wrap items-center gap-1">
                      {links.slice(0, VISIBLE_LINKS).map((link) => {
                        const Icon = link.icon

                        return (
                          <li key={link.key}>
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              aria-label={link.label}
                              title={link.label}
                              className="flex size-7 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors hover:border-brand hover:text-brand"
                            >
                              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          </li>
                        )
                      })}

                      {/*
                        ── LE QUATRIÈME BOUTON N'EST PLUS UN LIEN, C'EST UNE FLÈCHE ──

                        Elle prend EXACTEMENT la forme des trois pastilles qui la
                        précèdent — même carré de 28 px, même filet, même survol — parce
                        qu'elle occupe leur rang dans la rangée. Seul le chevron la
                        distingue, et c'est le seul signe nécessaire : il dit « la suite
                        est là », ce qu'un « +3 » n'aurait dit qu'à qui compte.

                        Le menu NOMME les destinations, là où les pastilles ne les
                        montrent qu'en pictogramme. C'est le gain caché du repli : deux
                        explorateurs voisins étaient deux boussoles identiques
                        impossibles à départager sans les survoler une par une ; ils
                        deviennent « Explorateur — taostats.io » et son voisin.

                        `DropdownMenu` de Radix plutôt qu'un `<details>` natif : il
                        apporte la fermeture au clic extérieur, la touche Échap, le
                        parcours aux flèches et le retour du focus au déclencheur. Un
                        `<details>` n'a que le clic sur son propre résumé, et ce bloc
                        est un composant SERVEUR — il peut placer un composant client,
                        pas en écrire un.
                      */}
                      {links.length > VISIBLE_LINKS ? (
                        <li>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label="Plus de liens"
                              title="Plus de liens"
                              className="flex size-7 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors hover:border-brand hover:text-brand data-[state=open]:border-brand data-[state=open]:text-brand-strong"
                            >
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </DropdownMenuTrigger>

                            {/* `w-64` et non 56 : les libellés d'explorateur portent un
                                nom d'hôte entier (« Explorateur — intel.arkm.com »), et
                                224 px les coupaient au milieu du domaine — soit la
                                seule partie qui distingue deux explorateurs l'un de
                                l'autre. */}
                            <DropdownMenuContent align="start" className="w-64">
                              {links.slice(VISIBLE_LINKS).map((link) => {
                                const Icon = link.icon

                                return (
                                  <DropdownMenuItem key={link.key} asChild>
                                    <a
                                      href={link.href}
                                      target="_blank"
                                      rel="noopener noreferrer nofollow"
                                      className="cursor-pointer"
                                    >
                                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                      <span className="min-w-0 truncate">{link.label}</span>
                                    </a>
                                  </DropdownMenuItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      ) : null}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA CARTE DE COURS — ELLE A QUITTÉ L'EN-TÊTE POUR LA TÊTE DE LA COLONNE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE ÉTAIT : `AssetQuote` ─────────────────────────────────────────
 *
 * Un bloc de largeur fixe (24rem) calé au bord DROIT de la rangée collante, en
 * face du nom. Trois lignes tenues au pixel : le cours et sa pastille, l'écart
 * absolu avec l'horodatage et le rapport en actif de référence, puis la barre
 * d'amplitude. Sa hauteur commandait celle de la rangée entière, et un `pb-7`
 * mesuré l'alignait sur la ligne de catégories, à gauche.
 *
 * ── POURQUOI ELLE DESCEND ───────────────────────────────────────────────────
 *
 * Le panneau de cours en haut à droite a été retiré (demande explicite), et la
 * référence (dropstab.com) pose le cours ailleurs : dans un encadré au-dessus du
 * graphique, à gauche. C'est une meilleure place, et pour une raison mesurable —
 * sur un écran large, l'ancien bloc était à huit cents pixels de la courbe qu'il
 * chiffre. Ici, le nombre et la forme se lisent d'un même regard, et la barre
 * d'amplitude désigne les mêmes bornes que les extrêmes de la courbe.
 *
 * ── CE QUI DISPARAÎT AVEC LE DÉPLACEMENT ────────────────────────────────────
 *
 * La largeur fixe de 24rem et son commentaire de trois paragraphes. Elle existait
 * pour empêcher la rangée de respirer à chaque tic du flux Binance : un cours qui
 * change de nombre de chiffres faisait varier la largeur du bloc, donc celle de
 * toute la rangée. Dans une carte qui occupe la largeur de sa colonne, le problème
 * n'existe plus — la boîte ne dépend pas de son contenu.
 *
 * Le `pb-7` mesuré disparaît pour la même raison : il n'y a plus de bloc voisin sur
 * lequel s'aligner.
 */
export async function AssetPriceCard({
  asset,
  assetClass,
  price,
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
}) {
  const t = await getTranslations('metric')
  const isForex = assetClass === 'forex'

  /*
   * ── DEUX COLONNES, ET C'EST CE QUI CALE LE COURS SUR LE RAPPORT ───────────
   *
   * Le bloc était une COLONNE de trois lignes, chacune tenue au bord droit. Les deux
   * premières disent pourtant la même chose sous deux unités — « 77 439,99 $US ▲ +0,68 % »
   * et « 31,58 ETH ▼ −0,83 % » — mais leurs valeurs n'avaient aucun rapport de position :
   * la pastille de variation de la première poussait le cours vers la gauche, si bien
   * qu'il flottait à une abscisse que rien d'autre ne partageait.
   *
   * Une grille `1fr auto` range les quatre éléments en deux pistes. Les VALEURS tombent
   * dans la première, tenues à droite : le cours et le rapport finissent donc sur la même
   * verticale. Les VARIATIONS tombent dans la seconde et commencent, elles aussi, à la
   * même abscisse.
   *
   * ⚠️ LE RAPPORT DOIT ÊTRE EN `contents` : c'est ce qui fait de ses deux enfants des
   * cases de CETTE grille au lieu d'une case unique. Sans cela il retomberait entier dans
   * la première piste, décalé sous le cours — le défaut qu'on corrige. Voir la note de
   * `AssetBenchmarkRatio`.
   */
  /*
   * ── LA VARIATION ABSOLUE EST DÉDUITE, ET LA FORMULE COMPTE ─────────────────
   *
   * La source publie un POURCENTAGE, pas un écart en monnaie. Le cours d'il y a
   * vingt-quatre heures s'en retrouve par `prix / (1 + variation/100)`, et l'écart est
   * la différence. Ce n'est PAS `prix × variation/100` — cette forme-là applique le
   * pourcentage au cours d'ARRIVÉE au lieu de celui de départ, et se trompe d'autant
   * plus que la variation est grande : à +50 %, elle donne un tiers de trop.
   */
  const absoluteChange =
    asset.change24h === undefined
      ? null
      : asset.price - asset.price / (1 + asset.change24h / 100)

  /* L'horodatage de la source, dans le fuseau du serveur. Il dit QUAND ce cours a été
     relevé — la question que pose immédiatement un chiffre qui bouge. */
  const stamp = Number.isNaN(Date.parse(asset.lastUpdated))
    ? null
    : new Intl.DateTimeFormat(await getLocale(), {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'long',
        timeZoneName: 'shortOffset',
      }).format(new Date(asset.lastUpdated))

  return (
    /*
      ── LA CARTE, ET POURQUOI ELLE NE PREND PAS TOUTE LA LARGEUR ────────────

      `max-w-md` : c'est un encadré posé au-dessus du graphique, pas un bandeau.
      Étirée sur les mille pixels de la colonne, la carte laisserait sept cents
      pixels de vide entre le cours et le bord droit, et la barre d'amplitude —
      qui n'a que deux bornes à porter — s'étalerait au point de ne plus se lire
      comme une échelle. C'est la proportion de la référence.
    */
    <section className="max-w-md space-y-2 rounded-card border border-border-subtle bg-panel p-4">
      {/* L'INTITULÉ PORTE LE LOGO ET LE NOM, comme sur la référence. Il dit de quoi
          ce nombre est le cours — utile dès qu'on arrive par un lien profond, et
          nécessaire une fois que l'en-tête est sorti de l'écran. */}
      <div className="flex items-center gap-2">
        <AssetLogo asset={asset} size={18} />
        <h2 className="text-sm font-semibold text-ink">
          {t('price.label')} {asset.symbol.toUpperCase()}
        </h2>
      </div>

      {/*
        ══════════════════════════════════════════════════════════════════════
        LE COURS, PUIS SA VARIATION EN PASTILLE PLEINE
        ══════════════════════════════════════════════════════════════════════

        Le bloc empilait quatre lignes de même poids : le cours, l'écart absolu,
        le pourcentage, l'horodatage — chacune en texte nu, à la même taille, dans
        la même colonne. Rien n'y désignait le chiffre qu'on vient chercher, et le
        pourcentage — la seconde information de la page — se lisait comme une note.

        La forme retenue est celle des terminaux de cotation : le cours en grand,
        et la variation JUSTE À CÔTÉ dans une pastille pleine. L'aplat est ce qui
        fait le travail : il détache le pourcentage du texte courant, le rattache
        visuellement au cours qu'il qualifie, et sa teinte donne le sens avant la
        lecture du signe.
      */}
      <p className="figure flex flex-wrap items-center gap-x-2.5 gap-y-1 leading-none">
        <span className="sr-only">{t('price.label')} : </span>
        <span className="text-3xl font-bold text-ink">{price}</span>

        {asset.change24h !== undefined ? <ChangeBadge value={asset.change24h} filled /> : null}
      </p>

      {/*
        LA SECONDE LIGNE PORTE CE QUI QUALIFIE LE COURS SANS ÊTRE LE COURS :
        de combien il a bougé en monnaie, et de quand il date. Les deux en gris,
        sur une seule ligne, parce qu'aucun des deux ne se lit avant le chiffre.

        ⚠️ L'ÉCART PASSE PAR `Money`, ET IL LE FAUT. Le code de devise du serveur
        (`asset.currency`) NE DÉCRIT PAS ce qui est affiché : le cours est rendu
        soit par `LiveBinancePrice` — qui cote en dollars — soit par `Money`, qui
        convertit dans la devise choisie par le lecteur, côté client. Formater
        l'écart avec `asset.currency` écrivait « $0.005069 … +€0.00005953 » sur la
        même ligne : deux devises pour un seul cours, relevé au navigateur.
      */}
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-ink-muted">
        {absoluteChange !== null ? (
          <span
            className={`tabular font-medium ${
              (asset.change24h ?? 0) >= 0 ? 'text-up' : 'text-down'
            }`}
          >
            {absoluteChange >= 0 ? '+' : ''}
            <Money value={absoluteChange} from={asset.currency} />
          </span>
        ) : null}

        {stamp ? <span>{t('price.asOf', { stamp })}</span> : null}

        {/* Le rapport en actif de référence ferme la ligne : l'écart absolu,
            l'horodatage et lui disent tous les trois « voici le même cours sous un
            autre angle ». Ils se lisent en enfilade, en gris, après le chiffre. */}
        <AssetBenchmarkRatio asset={asset} />
      </p>

      {/* L'amplitude 24 h ferme la carte, sur toute sa largeur : c'est une barre
          avec ses deux bornes, et la couper en deux la briserait. */}
      <AssetRangeBar asset={asset} isRate={isForex} />
    </section>
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
