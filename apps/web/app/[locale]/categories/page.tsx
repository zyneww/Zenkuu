import type { Metadata } from 'next'

import {
  CACHE_TTL_SECONDS,
  getCategories,
  getCryptoGlobalStats,
} from '@zenkuu/data'
import { EmptyState, SourceNote, formatCurrency, formatShare } from '@zenkuu/ui'
import { getLocale } from 'next-intl/server'

import { StatCard } from '@/components/charts/StatCard'

import { CategoryExplorer } from '@/components/categories/CategoryExplorer'
import { getContent } from '@/lib/content'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/*
 * Le mot « Ecosystem » servait ICI à pré-remplir le champ de recherche. Il vit
 * désormais dans `CategoryExplorer`, qui l'utilise pour ÉTIQUETER chaque ligne plutôt
 * que pour filtrer un texte — voir `categoryKind`, dont l'en-tête dit pourquoi ce
 * marqueur est le seul disponible et ce qu'il ne sait pas reconnaître.
 */

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>
}): Promise<Metadata> {
  const fr = await getContent()
  const { vue } = await searchParams

  /*
   * ⚠️ UNE SEULE CANONIQUE, ET LE PARAMÈTRE N'EN CRÉE PLUS UNE SECONDE.
   *
   * Les deux vues en déclaraient chacune une. C'était défendable tant que l'en-tête
   * servait deux titres et deux textes ; ça ne l'est plus depuis que le paramètre ne
   * fait que PRÉ-SÉLECTIONNER un filtre appliqué dans le navigateur. Le HTML rendu
   * est désormais identique de part et d'autre — deux canoniques déclareraient donc
   * deux pages là où un moteur n'en trouverait qu'une, dupliquée.
   *
   * `vue` reste lu par la page, pour ouvrir le filtre sur les écosystèmes.
   */
  void vue

  return {
    title: fr.pages.categories,
    description: fr.categories.subtitle,
    alternates: await pageAlternates('/categories'),
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SECTEURS ET NARRATIFS DE MARCHÉ — LA FORME DE LA RÉFÉRENCE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un titre, une explication, un champ de recherche, un tableau. Rien d'autre.
 *
 * ── CE QUE CETTE PAGE PORTAIT, ET QUI A DISPARU ─────────────────────────────
 *
 * Une bande de tête à quatre repères chiffrés, un palmarès de « secteurs en forte
 * hausse » en quatre cartes, une bande de faits saillants, puis une bande
 * méthodologique de clôture — quatre blocs POSÉS AUTOUR du tableau, qui repoussaient
 * la première ligne de données à un écran et demi du haut de la page.
 *
 * Tous répondaient à une question à laquelle le tableau répond déjà : « quels
 * secteurs montent » est un clic sur l'en-tête de variation, « combien de secteurs »
 * est la longueur de la liste. Le seul contenu qui ne s'y retrouvait pas — le fait
 * qu'un actif appartienne à PLUSIEURS secteurs, si bien que les capitalisations ne
 * s'additionnent pas — a rejoint le chapeau, deux lignes sous le titre. C'est aussi
 * ce que dit la référence à cet endroit exact.
 *
 * ── LA DOMINANCE EST CALCULÉE, LE RESTE NE L'EST PAS ────────────────────────
 *
 * ⚠️ La référence porte aussi des colonnes à 7 jours, 1 mois, 3 mois, une valorisation
 * pleinement diluée et un décompte de hausses/baisses par secteur. AUCUNE de ces
 * valeurs n'est publiée par notre source pour ses catégories : les inventer, ou les
 * recalculer à partir d'un échantillon d'actifs, produirait des chiffres que rien ne
 * pourrait vérifier (§5). Les colonnes affichées sont donc celles que la source
 * livre, plus la dominance — qui, elle, est un rapport exact entre deux valeurs
 * publiées.
 */
export default async function CategoriesPage({
  searchParams,
}: {
  /*
    ⚠️ `Promise` ET NON UN OBJET NU : depuis Next 15, `searchParams` est asynchrone.
    Le lire sans `await` renvoie la promesse elle-même, et `?.vue` y vaut toujours
    `undefined` — un défaut silencieux, la page rendant simplement la vue par défaut.
  */
  searchParams: Promise<{ vue?: string }>
}) {
  const t = await getPhrase()
  const fr = await getContent()

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * DEUX VUES POUR UNE SEULE PAGE — LES ÉCOSYSTÈMES ONT REJOINT LES SECTEURS
   * ══════════════════════════════════════════════════════════════════════════
   *
   * `/categories/ecosystemes` était une ROUTE À PART, et n'aurait jamais dû l'être :
   * elle rendait le MÊME composant, sur la MÊME requête, avec un filtre initial pour
   * seule différence. Un écosystème EST une catégorie chez la source — « Solana
   * Ecosystem » arrive dans la même réponse que « Layer 1 » et porte les mêmes champs.
   *
   * Deux routes obligeaient à maintenir deux en-têtes, deux jeux de métadonnées, deux
   * entrées de navigation et deux lignes de plan de site pour un `filter()`. Elles ont
   * fusionné : la vue vit dans un paramètre de requête, ce qui la garde ADRESSABLE —
   * indexable, partageable, ouvrable au clic milieu — sans dupliquer la page.
   */
  const { vue } = await searchParams
  const ecosystemes = vue === 'ecosystemes'

  /* En DOLLARS, et c'est la condition de la colonne de dominance : la source ne
     publie ses agrégats sectoriels qu'en dollars, et un rapport entre une
     capitalisation en dollars et un total en euros ne voudrait rien dire. */
  const [categories, globalStats] = await Promise.all([
    getCategories(),
    getCryptoGlobalStats('usd'),
  ])

  if (!categories.ok || categories.data.length === 0) {
    return (
      <div className="space-y-8">
        <CategoriesHeading title={fr.categories.title} lede={fr.categories.subtitle} note={null} />
        <EmptyState
          title={fr.states.unavailableTitle}
          description={categories.ok ? null : categories.reason}
          source={categories.source?.label ?? null}
        />
      </div>
    )
  }

  /* Les rubriques SANS capitalisation sont écartées ici, et pas dans le composant :
     c'est une décision d'éditorialisation de la page, et c'est elle qui l'annonce
     sous le titre. La source en publie environ sept cent cinquante ; la moitié sont
     des étiquettes de taxonomie ne portant aucun actif valorisé. */
  const listed = categories.data.filter((category) => (category.marketCap ?? 0) > 0)

  /* Le secteur de tête, tel que le tableau l'ordonne — donc par capitalisation. Il
     n'est pas choisi ici : c'est la première ligne de ce qui s'affiche en dessous. */
  const premier = listed[0]
  const locale = await getLocale()

  return (
    <div className="space-y-8">
      {/*
        ── UN SEUL TITRE, QUEL QUE SOIT LE FILTRE ────────────────────────────

        Le chapeau se dédoublait : « Écosystèmes » avec son propre lede et sa propre
        note quand `?vue=ecosystemes` était présent, « Catégories » sinon. C'était la
        dernière trace des deux pages : même requête, même tableau, mais un en-tête qui
        annonçait deux sujets.

        Le paramètre survit — il pré-sélectionne désormais le filtre de type, ce qui
        garde vivants les liens entrants et l'entrée « Chaînes » du menu — mais il ne
        change plus ce que la page DIT d'elle-même. Le lecteur voit un titre, un
        tableau, et un filtre dont l'état est visible : c'est la même page, ouverte
        autrement.
      */}
      <CategoriesHeading
        title={fr.categories.title}
        lede={t(
          'Les catégories décrivent les grandes familles d’actifs du marché. Un même actif peut relever de plusieurs d’entre elles — Bitcoin est à la fois « Layer 1 » et « Proof of Work » — si bien que les capitalisations de ce tableau ne s’additionnent pas.',
        )}
        note={t(
          '{n} secteurs cotés. La source en publie davantage, mais les autres ne portent aucun actif valorisé.',
        ).replace('{n}', String(listed.length))}
      />

      {/* ── LA BANDE DE TÊTE ────────────────────────────────────────────────
          Le motif d'ASXN, déjà posé sur /graphiques, /graphiques/actifs-reels,
          /graphiques/tresoreries et /graphiques/dominance (voir `StatCard`).

          Les trois chiffres viennent de la page elle-même : le nombre de secteurs est
          déjà écrit sous le titre, la capitalisation du plus gros et sa part sont déjà
          la première ligne du tableau. Ils passent devant parce que ce sont les
          réponses qu'on vient chercher — et parce qu'un tableau de 367 lignes ne dit
          rien tant qu'on n'a pas lu sa première.

          ⚠️ AUCUN TOTAL DE CAPITALISATION ICI, et la note du titre dit pourquoi : un
          actif relève de PLUSIEURS catégories — Bitcoin est « Layer 1 » ET « Proof of
          Work » — donc les capitalisations de ce tableau ne s'additionnent pas. Une
          somme serait un chiffre faux présenté comme un agrégat (§5). */}
      {premier ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label={t('Secteurs cotés')}
            value={String(listed.length)}
            note={t('Chaque actif peut relever de plusieurs')}
          />
          <StatCard
            label={t('Premier secteur')}
            value={premier.name}
            change24h={premier.marketCapChange24h}
            note={formatCurrency(premier.marketCap, 'USD', { compact: true }) ?? undefined}
          />
          {globalStats.ok && premier.marketCap ? (
            <StatCard
              label={t('Sa part du marché')}
              value={
                formatShare(
                  (premier.marketCap / globalStats.data.totalMarketCap) * 100,
                  locale,
                ) ?? '—'
              }
              note={t('Rapportée à la capitalisation totale')}
            />
          ) : null}
        </div>
      ) : null}

      <CategoryExplorer
        categories={listed}
        totalMarketCap={globalStats.ok ? globalStats.data.totalMarketCap : null}
        {...(ecosystemes ? { defaultKind: 'ecosysteme' as const } : {})}
      />

      {/* La source ne publie ces agrégats QU'EN DOLLARS, et c'est ce que nomme cette
          note. L'affichage, lui, suit la devise choisie par le visiteur : `Money`
          convertit depuis l'origine déclarée, au taux dont le sélecteur de préférences
          donne la date. Nommer l'origine est la condition du §5 — c'est elle qui
          permet de refaire le calcul. */}
      <SourceNote
        strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={`${categories.source.label} · agrégats cotés en USD`}
        href={categories.source.attributionUrl}
      />
    </div>
  )
}

/** Titre, explication, et le décompte qui justifie la longueur de la liste. */
function CategoriesHeading({
  title,
  lede,
  note,
}: {
  title: string
  lede: string
  note: string | null
}) {
  return (
    <header className="space-y-3">
      <h1 className="display-xl text-ink">{title}</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">{lede}</p>
      {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
    </header>
  )
}
