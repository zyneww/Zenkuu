import type { ComponentType } from 'react'

import { getTranslations } from 'next-intl/server'

import {
  ChevronDown,
  Code,
  Compass,
  FileText,
  Globe,
  MessageCircle,
  MessageSquareWarning,
  Users,
} from 'lucide-react'

import { DiscordGlyph, RedditGlyph, TelegramGlyph, XGlyph } from '@/components/BrandIcons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { getPhrase } from '@/lib/content'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { getCategories } from '@zenkuu/data'

import { Link } from '@/i18n/navigation'
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
 * ⚠️ `lucide` A RETIRÉ SES LOGOS DE MARQUE, et les destinations ne peuvent donc pas
 * être servies par lui. Elles l'étaient par des REMPLAÇANTS décrivant leur nature :
 * l'avion en papier de `Send` pour Telegram, la bulle de `MessageCircle` pour Reddit.
 *
 * C'était le mieux disponible, et c'était insuffisant : une bulle ne dit pas Reddit,
 * elle dit « discussion » — or la rangée d'une fiche en porte plusieurs, et deux
 * pictogrammes voisins qui se ressemblent ne distinguent plus rien.
 *
 * Telegram, Reddit et Discord portent désormais leur vraie marque, tracée dans
 * `BrandIcons` d'après `nexticons.in` (MIT, grille 24, la même que lucide). Voir ce
 * fichier pour la raison du remplissage plein — une silhouette de marque ne survit
 * pas à une réduction en contours de 1,5 px.
 *
 * `Forum` garde son groupe de personnes : ce n'est pas une marque mais un GENRE de
 * destination, et aucune silhouette ne le désigne.
 *
 * Une clé inconnue retombe sur la bulle générique : c'est le comportement voulu le
 * jour où la source en ajoute une, plutôt qu'une case vide ou une icône fausse.
 *
 * Le nom exact reste porté par `aria-label` et par l'infobulle dans tous les cas.
 */
/* `ComponentType<{ className?: string }>` et non `typeof Globe` : les icônes de
   `lucide` sont des `forwardRef`, notre glyphe X une fonction ordinaire. Le type le
   plus étroit — celui d'une icône lucide — exclurait le second, et c'est précisément
   celui qu'on veut ici. Seule compte la prop réellement passée : `className`. */
type LinkIcon = ComponentType<{ className?: string }>

const COMMUNITY_ICONS: Record<string, LinkIcon> = {
  Telegram: TelegramGlyph,
  Reddit: RedditGlyph,
  Discord: DiscordGlyph,
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
 * La NATURE de l'instrument, pour l'intitulé « BTC / JETON » de la carte de cours.
 *
 * Les six libellés existent déjà dans les tables de traduction : ils servent au rail
 * de `AssetMarketSheet`, qui les affiche sous le même besoin — dire ce qu'on regarde
 * quand la mise en page est la même pour six classes d'actifs.
 *
 * ⚠️ LA TABLE EST COMPLÈTE, ET C'EST `Record` QUI L'EXIGE. Celle de `AssetMarketSheet`
 * est un `Partial` — la crypto y est absente, parce que ce rail-là ne sert pas les
 * cryptomonnaies. Ici l'intitulé se rend pour les six, et un `Partial` laisserait un
 * « BTC / » suivi de rien sur la classe qu'on aurait oubliée.
 */
const NATURES: Record<AssetClass, string> = {
  crypto: 'Jeton',
  stock: 'Action',
  etf: 'Fonds indiciel coté',
  index: 'Indice boursier',
  commodity: 'Contrat à terme',
  forex: 'Paire de devises',
  /* « Collection NFT » et non « NFT » seul : la fiche porte une COLLECTION
     (Bored Apes, Punks) et non un exemplaire, et son cours est un prix plancher.
     La clé existait déjà — elle sert au titre de la page qui les liste. */
  nft: 'Collections NFT',
}

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
    links.push({ key: 'livre-blanc', href: asset.whitepaperUrl, label: phrase('Livre blanc'), icon: FileText })
  }

  if (asset.sourceCodeUrl) {
    links.push({ key: 'code', href: asset.sourceCodeUrl, label: 'Code source', icon: Code })
  }

  return (
        /* ══════════════════════════════════════════════════════════════════════
            ⚠️ `flex-wrap` — LE BLOC D'IDENTITÉ TOMBAIT À ZÉRO PIXEL SUR TÉLÉPHONE.

            Mesuré à 375 px de large, avant correction :

              rangée                          343 px
              bloc d'identité (min-w-0 flex-1)  0 px   ← disparu
              pastille « Smart Contract Platform » 22 px, tronquée à « S »

            Le mécanisme : `flex-1` vaut `flex: 1 1 0%`, donc une base NULLE. Le bloc
            ne réclame rien de lui-même et n'obtient que ce que ses voisins laissent.
            À côté, la bande de repères (`AssetTopBar`) demande plusieurs centaines de
            pixels pour ses cinq colonnes de cours ; sur une rangée qui n'en a que 343,
            elle prend tout et l'identité reçoit zéro. Le nom, les étiquettes et les
            liens étaient rendus dans une boîte de largeur nulle, d'où les pastilles
            réduites à leur première lettre et les pictogrammes empilés à la verticale.

            ⚠️ CE N'EST PAS LE `shrink-0` RETIRÉ DE LA BANDE QUI EST EN CAUSE, et la
            note de cette prop plus bas reste juste : sans son retrait, la bande
            poussait le nom HORS de la colonne. Elle cède désormais — mais céder ne
            suffit pas quand le voisin a une base nulle et qu'on est à 375 px : les
            deux se partagent alors un espace où ni l'un ni l'autre ne tient.

            `flex-wrap` sur la rangée, `basis-72` sur le bloc : en dessous d'environ
            288 px disponibles pour l'identité, la bande passe à la ligne suivante au
            lieu de l'écraser. C'est l'ordre demandé pour le téléphone — identité, puis
            cours — et sur grand écran rien ne change : les deux tiennent sur la rangée,
            `flex-1` reprend la main et la base ne sert plus.

            Commentaire NU et non `{​/* … *​/}` : on est juste après `return (`, où les
            accolades ouvriraient une seconde expression. C'est la forme qu'emploient
            les autres commentaires de ce fichier placés en position d'expression. */
        <div className="flex min-w-0 flex-wrap items-start gap-3">
          {/*
            ⚠️ L'ÉTOILE ISOLÉE A ÉTÉ RETIRÉE D'ICI (demande explicite).

            Elle ouvrait la rangée, collée au logo, et la note qui la tenait là
            défendait cette place : « suivre un actif est une action sur L'OBJET, pas
            sur son nom ». Le raisonnement reste juste ; ce qu'il ne voyait pas, c'est
            qu'une étoile NUE ne dit pas ce qu'elle fait.

            Dans un tableau, l'icône seule se comprend par répétition : cinquante
            lignes portent la même commande, et la colonne l'explique. En tête de
            fiche elle est seule de son espèce — rien n'apprend au lecteur ce qu'elle
            déclenche avant qu'il ne la survole.

            `FollowAssetButton` la remplace, nommé en toutes lettres, et se pose à
            l'AUTRE bout de la rangée — voir `watchAction` plus bas. La ligne
            d'identité y gagne le geste qu'elle avait perdu : le logo ouvre, le nom
            suit, l'action ferme.
          */}

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
          {/* ⚠️ 56 px DE DISQUE ET 36 DE LOGO, contre 44 et 28 (demande explicite).

              Le rapport entre les deux est conservé — le logo occupe les deux tiers
              du disque dans les deux mesures — parce que c'est lui qui donne l'anneau
              de fond régulier autour de la marque. Le remplir davantage collerait le
              dessin au bord ; le remplir moins ferait une pastille vide.

              56 px cale le disque sur trois lignes de l'en-tête plutôt que deux : le
              nom (18 px), le code et la rangée d'étiquettes tiennent désormais en
              face de lui, ce qui donne au bloc un bord haut et un bord bas communs
              au lieu d'une icône flottant à mi-hauteur. */}
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-surface">
            <AssetLogo asset={asset} size={36} />

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

          {/* ── `flex-1` : LE BLOC D'IDENTITÉ RÉCLAME LE MOU DE LA RANGÉE ──────

              Sans lui, ce bloc est dimensionné sur son contenu et ne grandit pas, même
              quand la rangée a de la place à donner. Mesuré au navigateur après
              l'agrandissement des étiquettes, fenêtre de 2 400 px :

                rangée                        1 336 px
                bloc d'identité                 561 px   ← figé sur son contenu
                bande de repères                695 px
                mou absorbé par le `ml-auto`     80 px

              Il fallait 564 px à la ligne des secteurs pour tenir d'un trait. Elle en
              avait 561, et les pastilles de réseau passaient donc à la ligne suivante —
              pour TROIS pixels, avec quatre-vingts laissés vacants juste à côté.

              `flex-1` les lui rend : la ligne redevient unique, donc alignable avec la
              bande (voir `self-end` plus bas). Le repli reste possible pour un actif à
              étiquettes longues — c'est le comportement voulu, décrit plus bas — il
              n'est simplement plus déclenché par du blanc inutilisé.

              ⚠️ `basis-72` S'AJOUTE À `flex-1`, ET NE LE CONTREDIT PAS. `flex-1` vaut
              `flex: 1 1 0%` : la base nulle est ce qui a fait tomber ce bloc à zéro
              pixel sur téléphone (voir la note de la rangée, plus haut). La classe de
              base arrive APRÈS dans la déclaration et remplace ce `0%` par 18 rem —
              le bloc réclame donc 288 px avant de partager le reste. Au-dessus de
              cette largeur, la croissance et la contraction restent celles de
              `flex-1`, et la mesure ci-dessus tient inchangée. */}
          <div className="min-w-0 flex-1 basis-72">
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
            {/* ⚠️ `leading-none` A ÉTÉ RETIRÉ DES DEUX, ET C'EST UN RELEVÉ.
                Le nom sortait en 18/18 et le ticker en 14/14 — l'interligne écrasé sur
                la taille du glyphe. Mesuré le 2026-09-04 sur la fiche Bitcoin de la
                référence : « Bitcoin » y est en 18/28/700 et « BTC Price » en
                14/20/400. Dix pixels d'interligne en plus sur l'un, six sur l'autre.

                Ce sont exactement les valeurs que `--text-lg` et `--text-sm` portent
                déjà : il suffisait donc de laisser les jetons faire leur travail. Une
                ligne serrée à la taille du glyphe est ce qui donne à un en-tête son air
                comprimé, et la référence ne comprime pas le sien. */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="text-lg font-bold text-ink">
                {assetName(asset.name, assetClass, phrase)}
              </h1>
              <span className="text-sm font-normal uppercase text-ink-muted">
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
              /* ── LA RANGÉE A GRANDI D'UN CRAN (demande explicite) ──────────────

                 Elle était en `text-xs` avec des pastilles à `py-0.5` et des carrés
                 de 28 px — l'échelle d'une légende, alors que ce sont les seuls
                 CLASSEMENTS de l'actif et ses seuls liens sortants. Passée en
                 `text-sm`, pastilles à `py-1`, carrés de 32 px et pictogrammes de 16.

                 Trente-deux pixels, ce n'est pas une valeur choisie au hasard : c'est
                 la hauteur de « Suivre l'actif » et de la pastille de signalement, à
                 l'autre bout de la même rangée. Les quatre commandes de la ligne
                 d'identité tombent donc sur la même cote. */
              <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-ink-muted">
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

                {/* ══════════════════════════════════════════════════════════════
                    LES PASTILLES PASSENT DU CONTOUR À L'APLAT

                    Elles portaient `rounded-pill border border-border-subtle` : un
                    ovale cerné, transparent. Relevé sur `coingecko.com/en/coins/bitcoin`
                    le 2026-09-06 : ses pastilles de catégorie sont des RECTANGLES
                    ARRONDIS PLEINS — fond `#eff2f5`, rayon 8, rembourrage 6/10,
                    hauteur 28, corps 14 en graisse 600. Aucun bord.

                    L'écart n'est pas décoratif. Un ovale cerné et transparent se lit
                    comme un jeton d'étiquetage ; un rectangle plein se lit comme une
                    cible. Ces pastilles MÈNENT quelque part — vers la page de la
                    catégorie — et la forme pleine le dit mieux.

                    ⚠️ CELLE QUI NE MÈNE NULLE PART GARDE LA MÊME FORME, et c'est
                    voulu : la distinction se fait au SURVOL, où seule la première
                    s'éclaire. Deux formes différentes pour deux états de disponibilité
                    d'une même donnée ferait lire une hiérarchie qui n'existe pas.
                    ══════════════════════════════════════════════════════════════ */}
                {categories.map((category) => {
                  const id = categoryIds.get(normalizeLabel(category))

                  const forme =
                    'min-w-0 truncate rounded-control bg-surface-muted px-2.5 py-1.5 font-semibold leading-4 text-ink-secondary'

                  return id ? (
                    <Link
                      key={category}
                      href={{ pathname: '/categories/[id]', params: { id: id } }}
                      className={`${forme} transition-colors hover:text-brand-strong`}
                    >
                      {category}
                    </Link>
                  ) : (
                    <span key={category} className={forme}>
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
                      /* `h-5` suit les pastilles : un filet de 16 px entre deux objets
                         de 32 se lit comme un tiret, pas comme une césure.

                         ⚠️ COMMENTAIRE NU ET NON `{​/* … *​/}` : on est dans la branche
                         d'un ternaire, où les accolades seraient lues comme un objet
                         littéral. C'est l'erreur qui a mis la page en 500 au premier
                         essai — même forme que les autres commentaires de ce fichier
                         placés en position d'expression. */
                      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border-subtle" />
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
                              className="flex size-8 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors hover:border-brand hover:text-brand"
                            >
                              {/* 16 px et non 14 : le carré est passé à 32, et un
                                  pictogramme laissé à 14 y flotte au lieu de le
                                  remplir. Même rapport qu'avant, à l'échelle
                                  au-dessus. */}
                              <Icon className="h-4 w-4" aria-hidden="true" />
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
                              aria-label={phrase('Plus de liens')}
                              title={phrase('Plus de liens')}
                              className="flex size-8 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors hover:border-brand hover:text-brand data-[state=open]:border-brand data-[state=open]:text-brand-strong"
                            >
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
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

          {/* ── LE SUIVI FERME LA RANGÉE, À L'OPPOSÉ DU LOGO ────────────────────

              C'est la zone que la capture 2 entoure en rouge : le bord droit de la
              ligne d'identité, en face du nom. La place a une logique de lecture —
              on identifie l'actif à gauche, on agit dessus à droite — et c'est celle
              qu'occupent les commandes sur les deux références.

              `ml-auto` plutôt qu'un `justify-between` sur le conteneur : la rangée
              porte trois blocs de largeurs très inégales (logo, identité, action), et
              un `justify-between` écarterait aussi le logo du nom. Poussé par sa
              propre marge, le bouton part à droite sans toucher au couple de gauche.

              `mt-1` l'aligne optiquement sur la première ligne de titre plutôt que sur
              le haut du bloc : le nom est en 18 px, le bouton en fait 32 de haut.

              ⚠️ `shrink-0` EST PARTI, ET IL LE FALLAIT. Cette prop ne porte plus un
              bouton de 110 px mais la BANDE DE REPÈRES (voir `AssetTopBar`), qui fait
              plusieurs centaines de pixels. Interdite de se contracter, elle poussait
              le nom et les étiquettes hors de la colonne dès que la fenêtre se
              resserrait. `min-w-0` la laisse céder, et ses cellules tronquent.

              ══════════════════════════════════════════════════════════════════════
              ⚠️ `mt-1` EST PARTI AUSSI, REMPLACÉ PAR `self-center` : « TROP HAUT »
              ══════════════════════════════════════════════════════════════════════

              La rangée est en `items-start` — elle aligne ses trois blocs par le HAUT,
              ce qui est juste pour le logo et le nom. La bande y était donc accrochée
              au sommet, et `mt-1` ne compensait qu'un pixel : elle flottait au-dessus
              du bloc d'identité, qui fait deux lignes (nom, puis étiquettes).

              `self-center` centrait la bande sur la HAUTEUR du bloc de gauche : elle
              tombait donc ENTRE la ligne du nom et celle des étiquettes, en face de
              ni l'une ni l'autre.

              ══════════════════════════════════════════════════════════════════════
              `self-end` — LA BANDE SE POSE SUR LA LIGNE DES SECTEURS ET DES RÉSEAUX
              ══════════════════════════════════════════════════════════════════════

              Demandé explicitement. Le bloc de gauche a deux lignes — le nom, puis
              les étiquettes de secteur et les pastilles de réseau — et c'est la
              SECONDE qui porte des objets de même nature que la bande : des cadres de
              32 px qu'on clique. Alignées par le bas, les deux moitiés de la rangée
              posent leurs commandes sur une seule et même cote, d'un bord à l'autre
              de la page.

              Par le BAS et non par un centrage sur cette ligne : la bande est plus
              haute qu'une pastille (deux lignes, intitulé et valeur), et c'est sa
              base — la ligne des valeurs — qui doit tomber sur la rangée des
              étiquettes. Un centrage la remonterait d'une demi-hauteur d'intitulé.

              Toujours posé sur l'enfant et non sur la rangée : `items-end` sur la
              rangée ferait descendre le logo avec elle, alors qu'il reste calé sur la
              première ligne du titre. */}
          {/* ══════════════════════════════════════════════════════════════════════
              ⚠️ `ml-auto` EST PARTI — IL ANNULAIT LE `flex-1` DU BLOC D'IDENTITÉ
              ══════════════════════════════════════════════════════════════════════

              Le `flex-1` posé juste au-dessus n'avait AUCUN effet, et la ligne des
              secteurs continuait de se replier alors qu'il restait quatre-vingts
              pixels libres. Ce n'est pas un oubli de calcul, c'est la règle :

                CSS Flexbox §9.5 — si l'espace libre est positif et qu'une marge
                automatique existe sur l'axe principal, il lui est distribué EN
                ENTIER, et « le facteur de croissance est alors traité comme nul ».

              Une marge automatique et un `flex-grow` sont donc exclusifs, et c'est la
              marge qui gagne. Le mou partait intégralement dans ce `ml-auto` avant
              que le bloc de gauche n'ait pu en prendre un pixel.

              La bande n'en a plus besoin : le bloc d'identité, qui grandit maintenant
              pour de bon, la pousse au bord droit tout seul. Même résultat visuel, et
              la ligne des secteurs récupère la place qui lui manquait. */}
          <div className="min-w-0 self-end">{watchAction}</div>
        </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES COMMANDES DE L'EN-TÊTE — CE QU'IL RESTE DE LA BANDE DE REPÈRES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE PORTAIT, ET OÙ C'EST PARTI ───────────────────────────────────
 *
 * Trois cellules « intitulé au-dessus, valeur en dessous » — cours, variation 24 h,
 * amplitude 24 h — relevées sur `tokenomist.ai/bitcoin`, plus les deux commandes.
 * Les trois cellules existaient parce qu'`AssetPriceCard` avait été retirée de la
 * fiche et qu'il fallait bien que le cours reste quelque part.
 *
 * ⚠️ LA CARTE DE COURS EST RÉTABLIE, EN TÊTE DU RAIL (demande explicite, d'après
 * `tokenterminal.com/explorer/projects/hyperliquid`, qui pose son bloc « Price » en
 * haut de colonne gauche). Les trois repères y sont donc retournés — et ils ne
 * pouvaient pas rester ici en même temps : deux cours à trois cents pixels l'un de
 * l'autre, dont l'un en direct et l'autre non, posent au lecteur la question de
 * savoir lequel fait foi.
 *
 * Ce qui reste est ce qui n'a pas de meilleure place : les deux COMMANDES. Elles
 * ferment la ligne d'identité, à droite du nom, comme le « ☆ Watchlist » de la
 * référence.
 *
 * ⚠️ « CREATE ALERT » N'EXISTE PAS SUR CE SITE, et n'est donc pas dessiné — la
 * fonctionnalité d'alerte n'existe pas, et un bouton qui n'arme rien serait pire
 * qu'un bouton absent. La note d'origine le disait déjà ; elle reste vraie.
 */
export async function AssetTopBar({
  watchAction,
  sourceUrl,
}: {
  /** La commande de suivi, qui ferme la rangée. */
  watchAction: React.ReactNode
  /**
   * Page de cet actif chez le fournisseur qui publie ses chiffres.
   *
   * Elle alimente la pastille « Signaler une donnée » — voir `ReportDataLink` pour
   * la raison de cette destination. Absente, la pastille ne se rend pas.
   */
  sourceUrl?: string
}) {
  /* UN SEUL TRADUCTEUR DÉSORMAIS. Il en fallait deux tant que la rangée portait des
     repères chiffrés : `t` lisait le catalogue next-intl pour leurs intitulés
     (`metric.price.label`), `phrase` la table de phrases pour le reste. Les repères
     sont descendus dans le rail avec la carte de cours ; il ne reste ici que du texte
     d'interface, et la table de phrases le porte seule. */
  const phrase = await getPhrase()

  return (
    /* `shrink-0` et non plus `flex-wrap` : à trois cellules la rangée devait pouvoir
       se replier sous le nom sur les fenêtres étroites. À deux boutons elle ne peut
       plus déborder de rien, et le repli n'aurait plus qu'un effet — décrocher les
       commandes du bord droit sans raison. */
    <div className="flex shrink-0 items-center gap-2">
      <ReportDataLink
        {...(sourceUrl ? { href: sourceUrl } : {})}
        label={phrase('Signaler une donnée')}
      />
      {watchAction}
    </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA PASTILLE « SIGNALER UNE DONNÉE »
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Demandée d'après `tokenomist.ai/bitcoin`, où elle précède « Watchlist » : une
 * bulle à point d'exclamation, dont l'infobulle dit « Report data ».
 *
 * ── ⚠️ ELLE NE PEUT PAS SIGNALER À NOUS, ET VOICI POURQUOI ────────────────────
 *
 * Signaler suppose un destinataire. Ce site n'en publie aucun : il n'existe ni
 * adresse de contact ni formulaire — c'est écrit noir sur blanc dans `AuthDialog`,
 * et vérifié ici (aucun `mailto:` dans `apps/web` hors cette note). Un bouton qui
 * ouvre un formulaire fantôme, ou pire qui ne fait rien, serait un décor.
 *
 * Elle pointe donc vers LA SOURCE de la donnée — la page de cet actif chez le
 * fournisseur qui la publie. C'est le seul endroit où un chiffre faux peut
 * réellement être corrigé : nous ne produisons aucune de ces valeurs, nous les
 * relayons. Le libellé et l'infobulle le disent en toutes lettres plutôt que de
 * laisser croire à un guichet interne.
 *
 * Sans source déclarée, la pastille ne se rend pas. Une bulle inerte au bout de la
 * rangée poserait exactement la question qu'elle prétend résoudre.
 */
function ReportDataLink({ href, label }: { href?: string; label: string }) {
  /* ⚠️ L'URL ARRIVE EN PROP, ELLE N'EST PAS LUE SUR L'ACTIF. `AssetDetail` ne porte
     PAS de champ `source` — vérifié dans `packages/data/src/types.ts` : la source
     vit sur l'enveloppe de la réponse (`asset.source`), pas sur les données
     elles-mêmes (`data`). C'est la fiche qui tient les deux et fait le lien. */
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      /* `h-8 w-8` — 32 px, la hauteur MESURÉE de `FollowAssetButton` à côté, et non
         celle qu'on lui suppose : elle était écrite `h-9` ici, et le relevé au
         navigateur donnait 36 contre 32 pour son voisin. Quatre pixels d'écart entre
         deux commandes de la même rangée les font lire comme deux rangs différents —
         c'est le défaut même qui vient d'être corrigé sur la barre du graphique. */
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
      title={label}
      aria-label={label}
    >
      <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
    </a>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA CARTE DE COURS — RETIRÉE DE LA FICHE, CONSERVÉE DANS LE DÉPÔT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ CE COMPOSANT N'EST PLUS RENDU (demande explicite : « enlève ce qui est
 * entouré en bleu », capture du 2026-09-05). Il ouvrait la colonne principale,
 * juste au-dessus du graphique.
 *
 * Ce qu'il portait n'est pas perdu : le cours, la variation 24 h et l'amplitude
 * du jour sont repris par `AssetTopBar`, la bande de l'en-tête. La fiche gagne au
 * passage la hauteur de la carte — le graphique commence d'autant plus haut, ce
 * qui était l'argument même de sa descente dans la colonne.
 *
 * Le code reste ici, comme `AssetTechSheet` et `AssetMarketDrawer` avant lui :
 * c'est sa PRÉSENCE sur la fiche qui a été retirée, pas sa justesse.
 *
 * ── CE QUI SUIT DÉCRIT LE COMPOSANT TEL QU'IL ÉTAIT MONTÉ ───────────────────
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
  /* Deux traducteurs, et il en faut deux : `t` lit le catalogue next-intl, dont
     les clés sont des chemins (`metric.price.label`) ; `phrase` lit la table de
     phrases, dont les clés SONT le français. Les six natures d'instrument vivent
     dans la seconde — elles y étaient déjà pour `AssetMarketSheet`. */
  const phrase = await getPhrase()
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


  return (
    /*
      ── LA CARTE, ET POURQUOI ELLE NE PREND PAS TOUTE LA LARGEUR ────────────

      `max-w-md` : c'est un encadré posé au-dessus du graphique, pas un bandeau.
      Étirée sur les mille pixels de la colonne, la carte laisserait sept cents
      pixels de vide entre le cours et le bord droit, et la barre d'amplitude —
      qui n'a que deux bornes à porter — s'étalerait au point de ne plus se lire
      comme une échelle. C'est la proportion de la référence.
    */
    /*
      ══════════════════════════════════════════════════════════════════════════
      LA CARTE PREND SA LARGEUR, ET L'AMPLITUDE PASSE EN FACE DU COURS
      ══════════════════════════════════════════════════════════════════════════

      Elle était bornée à `max-w-md` (448 px), et l'amplitude fermait donc la carte
      SOUS le cours, sur toute sa largeur. La note qui défendait ce choix disait vrai
      de cette géométrie : « c'est une barre avec ses deux bornes, et la couper en deux
      la briserait ».

      La référence pose les deux côte à côte — cours à gauche, amplitude à droite, la
      barre d'outils dessous sur toute la largeur. Cela demande une carte large, et
      c'est le seul changement : la barre n'est pas coupée, elle est DÉPLACÉE dans
      l'espace que la carte n'occupait pas.

      ⚠️ SOUS `sm`, ELLES SE REMETTENT L'UNE SOUS L'AUTRE. Une amplitude de 200 px à
      côté d'un cours de 200 px sur un téléphone donnerait deux colonnes illisibles ;
      `flex-col` par défaut, `sm:flex-row` ensuite.
      ══════════════════════════════════════════════════════════════════════════ */
    /* ── PLUS DE CARTE : LA RÉFÉRENCE POSE SON BLOC PRIX À PLAT ───────────────

       Elle portait `rounded-card border border-border-subtle bg-panel p-4`. Relevé au
       navigateur sur `coingecko.com/en/coins/hyperliquid` le 2026-09-06 : le nom, le
       cours, la variation et l'amplitude du jour sont posés directement sur le blanc
       de la page, sans le moindre bord — la remontée des ancêtres depuis le titre ne
       rencontre aucune surface opaque avant la racine.

       Le rembourrage part avec le cadre : il n'y a plus de bord dont s'écarter, et le
       bloc s'aligne alors sur la même verticale que les libellés du rail juste
       dessous. `pb-4` seul demeure, pour que le filet du premier groupe de repères ne
       vienne pas se coller sous l'amplitude. */
    <section className="space-y-2 pb-4">
      {/* L'INTITULÉ PORTE LE LOGO ET LE NOM, comme sur la référence. Il dit de quoi
          ce nombre est le cours — utile dès qu'on arrive par un lien profond, et
          nécessaire une fois que l'en-tête est sorti de l'écran. */}
      {/* ══════════════════════════════════════════════════════════════════════
          LE COURS ET L'AMPLITUDE SONT EMPILÉS, ET C'EST LA COLONNE QUI L'IMPOSE

          Ils ont été côte à côte — cours à gauche, amplitude à droite — pendant que
          cette carte occupait la pleine largeur de la colonne principale. La note
          d'alors le disait : « cela demande une carte large ».

          ⚠️ ELLE NE L'EST PLUS. La carte est redescendue dans le RAIL, qui fait
          424 px dont 408 utiles, et 408 ne suffit pas aux deux : mesuré au
          navigateur avant correction, l'amplitude gardait ses 224 px fixes et il
          restait 144 px au cours — « 79 920,44 $US » en 30 px n'y tient pas, et la
          barre se retrouvait écrasée dans le coin.

          C'est donc la géométrie d'AVANT qui redevient juste, et sa note aussi :
          « c'est une barre avec ses deux bornes, et la couper en deux la briserait ».
          L'amplitude ferme la carte sous le cours, sur toute la largeur.

          Plus de point de rupture : la carte est dans une colonne étroite à toutes
          les tailles d'écran, et un `sm:flex-row` ne ferait que rouvrir le défaut sur
          les fenêtres larges — là où le rail, lui, ne s'élargit pas.
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <div className="min-w-0 space-y-2">
      {/*
        ══════════════════════════════════════════════════════════════════════
        « BTC / JETON » — LE CODE PUIS LA NATURE, EN CAPITALES ATTÉNUÉES
        ══════════════════════════════════════════════════════════════════════

        Forme relevée sur `blockworks.com/price/hyperliquid` : « HYPE / TOKEN »,
        11 px, gris, au-dessus du grand prix.

        Ce qui part avec l'ancienne ligne : un SECOND logo. L'en-tête d'identité
        en porte déjà un, à 36 px, cinquante pixels plus haut — celui-ci le
        répétait à 18 px pour la même marque, sur la même page, sans rien ajouter.

        Ce qui arrive : la NATURE de l'instrument. « Price BTC » disait deux fois
        ce que le grand chiffre dessous dit déjà (c'est un prix, c'est du BTC).
        « BTC / JETON » dit ce que la page ne disait nulle part au-dessus du cours :
        qu'on regarde une cryptomonnaie et non une action, distinction qui compte
        sur un site qui sert six classes d'actifs sous la même mise en page.

        Les six libellés existaient déjà dans les tables de traduction — ils
        servent au rail de `AssetMarketSheet` — et n'ont donc rien coûté.
      */}
      <p className="text-micro font-medium text-ink-muted">
        {asset.symbol.toUpperCase()}
        <span aria-hidden="true"> / </span>
        <span className="sr-only">, </span>
        {phrase(NATURES[assetClass])}
      </p>

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
      {/*
        ══════════════════════════════════════════════════════════════════════
        LE COURS SEUL SUR SA LIGNE, LA VARIATION SOUS LUI EN TEXTE NU
        ══════════════════════════════════════════════════════════════════════

        Le bloc portait le cours et une PASTILLE PLEINE de pourcentage sur la même
        ligne, puis une seconde ligne grise avec l'écart en monnaie, l'horodatage
        et le rapport à l'actif de référence.

        La référence pose les deux nombres l'un sous l'autre, tous deux en texte
        nu : « $81.66 » puis « -$1.02 ↓1.25% ». C'est plus juste que la pastille
        pour une raison simple — l'écart en monnaie et le pourcentage disent LA
        MÊME chose sous deux unités, et les séparer (l'un dans un aplat contre le
        cours, l'autre en gris une ligne plus bas) cassait la paire. Réunis, ils se
        lisent d'un seul regard, et leur couleur commune porte le sens.

        ⚠️ CE QUI DISPARAÎT NE DISPARAÎT PAS DU SITE. L'horodatage est écrit sous
        le graphique par `SourceNote`, avec la source qui l'a publié — c'est-à-dire
        au bon endroit, contre la donnée qu'il date. Le rapport à l'actif de
        référence part, lui, sans repli : la référence ne le porte pas.

        La flèche est CALCULÉE, pas écrite : `↓` et `↑` selon le signe, doublée du
        signe arithmétique sur l'écart. La couleur ne porte jamais seule (§9).
      */}
      {/* `leading-10` = 40 px. `--text-3xl` porte 44, ce qui est le bon interligne pour
          un chiffre héros posé dans une carte, entouré de texte. Ici il ouvre une fiche,
          et la référence le serre : son cours sort en 36/40/700, mesuré le 2026-09-04.
          Les quatre pixels se voient — ils séparent le cours de la ligne de variation
          juste dessous, qui doit en rester solidaire. */}
      <p className="figure leading-none">
        <span className="sr-only">{t('price.label')} : </span>
        <span className="text-3xl font-bold leading-10 text-ink">{price}</span>
      </p>

      <p
        className={`tabular flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs font-medium ${
          (asset.change24h ?? 0) >= 0 ? 'text-up' : 'text-down'
        }`}
      >
        {absoluteChange !== null ? (
          <span>
            {absoluteChange >= 0 ? '+' : '−'}
            <Money value={Math.abs(absoluteChange)} from={asset.currency} />
          </span>
        ) : null}

        {asset.change24h !== undefined ? (
          <span>
            <span aria-hidden="true">{asset.change24h >= 0 ? '↑' : '↓'} </span>
            {Math.abs(asset.change24h).toFixed(2)} %
          </span>
        ) : null}
      </p>
        </div>

        {/* Aucune largeur imposée : la barre prend celle de la carte, donc celle du
            rail. Elle portait `sm:w-56` — 224 px fixes — tant qu'elle était à côté du
            cours et devait lui laisser de la place ; sous lui, cette borne ne ferait
            que la raccourcir au milieu d'une ligne vide. */}
        <AssetRangeBar asset={asset} isRate={isForex} />
      </div>
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
