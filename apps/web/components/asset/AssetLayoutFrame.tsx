'use client'

import { Check, ChevronDown, Columns2, Newspaper, Rows2, PanelLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Cadre à deux colonnes de la fiche, et son sélecteur de disposition.
 *
 * ── POURQUOI UN CHOIX, PLUTÔT QU'UNE BONNE DISPOSITION ────────────────────────
 *
 * La fiche impose un rail de chiffres à gauche et le graphique à droite. C'est le
 * bon défaut — c'est celui de la référence — mais il n'est pas bon pour TOUT LE
 * MONDE : sur un portable de treize pouces, le rail prélève 288 pixels sur les 900
 * disponibles, et la courbe se retrouve à l'étroit ; sur un grand écran, on préfère
 * parfois voir les chiffres en bandeau et donner toute la largeur au tracé.
 *
 * Aucune de ces trois lectures n'est fausse, et rien dans la page ne permet de
 * deviner laquelle convient. C'est donc un réglage, comme chez OKX — et comme chez
 * eux, il est MÉMORISÉ : un réglage de confort qu'il faut reposer à chaque visite
 * coûte plus qu'il ne rapporte.
 *
 * ── LE RAIL N'EST PAS MASQUÉ EN LARGE, IL EST DÉPLACÉ ─────────────────────────
 *
 * La disposition « pleine largeur » ne cache pas les chiffres : elle les remet
 * SOUS le contenu, en trois colonnes. Les masquer ferait de ce bouton un interrupteur
 * qui supprime de l'information, ce qu'un réglage de mise en page n'a pas à faire —
 * et le lecteur qui l'a choisi une fois ne comprendrait pas, trois visites plus tard,
 * pourquoi sa fiche a moins de contenu que celle du voisin.
 */

export type AssetLayout = 'rail' | 'compact' | 'wide'

const LAYOUTS: { id: AssetLayout; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    id: 'rail',
    label: 'Rail complet',
    hint: 'Chiffres à gauche, graphique à droite',
    icon: <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'compact',
    label: 'Rail étroit',
    hint: 'Plus de largeur pour le graphique',
    icon: <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'wide',
    label: 'Pleine largeur',
    hint: 'Chiffres en bandeau sous le contenu',
    icon: <Rows2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
]

const STORAGE_KEY = 'zenkuu:asset-layout'
const NEWS_KEY = 'zenkuu:asset-news'

function isLayout(value: string | null): value is AssetLayout {
  return value === 'rail' || value === 'compact' || value === 'wide'
}

export function AssetLayoutFrame({
  rail,
  news,
  tabsBar,
  children,
}: {
  rail: React.ReactNode
  /**
   * Barre d'onglets, rendue PLEINE LARGEUR au-dessus de la grille.
   *
   * ── POURQUOI ELLE REMONTE ICI ─────────────────────────────────────────────
   *
   * Elle vivait dans la colonne de droite, avec les panneaux qu'elle commande. Deux
   * défauts en découlaient, l'un de forme et l'autre de fond.
   *
   * De forme : son filet s'arrêtait au bord de la colonne, si bien que la page
   * portait deux traits horizontaux de longueurs différentes à quelques pixels l'un
   * de l'autre — celui des onglets, court, et celui du bandeau de commande, long.
   *
   * De fond : la barre commande le contenu de la colonne, mais elle NOMME les
   * sections de la fiche entière. La reléguer à droite la faisait lire comme un
   * réglage du graphique, au même rang que « Prix ▾ » ou « Comparer ▾ ».
   *
   * Pleine largeur sous l'en-tête, elle redevient ce qu'elle est : le sommaire de la
   * page. C'est aussi la disposition de la référence.
   */
  tabsBar?: React.ReactNode
  /**
   * Colonne d'actualités, dépliable par le bouton du bandeau de commande.
   *
   * Reçue en NŒUD DÉJÀ RENDU et non en données : ce cadre ne sait rien des articles,
   * il ne sait qu'ouvrir et fermer une colonne. C'est aussi ce qui permet à l'appelant
   * de filtrer les mentions côté serveur — un travail qui n'a aucune raison de
   * descendre dans un composant client.
   */
  news?: React.ReactNode
  children: React.ReactNode
}) {
  /**
   * `rail` au premier rendu, TOUJOURS, quel que soit le contenu du stockage.
   *
   * Lire `localStorage` dans l'initialiseur de `useState` produirait un HTML serveur
   * (qui n'a pas accès au stockage) différent du premier rendu client — l'écart
   * d'hydratation classique, que React signale en console et corrige en repeignant
   * l'arbre entier. On part donc du défaut et l'on applique la préférence dans un
   * effet, après montage : le seul coût est un reflux de mise en page pour les
   * lecteurs qui ont choisi autre chose, une fois, au chargement.
   */
  const [layout, setLayout] = useState<AssetLayout>('rail')
  const [open, setOpen] = useState(false)

  /* Repliée au PREMIER RENDU, et pour le même motif que la disposition : le HTML du
     serveur ne connaît ni la préférence ni la largeur de l'écran. L'état définitif est
     posé dans l'effet ci-dessous. */
  const [newsOpen, setNewsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isLayout(stored)) setLayout(stored)

      /*
        ── LA COLONNE S'OUVRE D'ELLE-MÊME SUR LES GRANDS ÉCRANS ──────────────

        Elle restait fermée tant qu'on ne l'avait pas trouvée, et c'était un mauvais
        arbitrage : au-delà de 1280 pixels, la place existe SANS rien retirer au
        graphique — c'est précisément le seuil auquel elle devient une troisième
        colonne au lieu de passer sous le contenu. La référence l'affiche d'ailleurs
        ouverte, et pour la même raison.

        En dessous du seuil, rien ne change : la colonne passerait sous le graphique
        et allongerait la page pour un contenu que personne n'a demandé.

        Le choix EXPLICITE l'emporte toujours sur ce défaut, dans les deux sens : qui a
        fermé la colonne la retrouve fermée sur un écran large, qui l'a ouverte la
        retrouve ouverte sur un écran étroit. Le stockage ne dit « rien » qu'avant le
        premier clic — c'est là, et seulement là, que la largeur décide.
      */
      const storedNews = window.localStorage.getItem(NEWS_KEY)
      if (storedNews === 'open') setNewsOpen(true)
      else if (storedNews === null && window.matchMedia('(min-width: 1280px)').matches) {
        setNewsOpen(true)
      }
    } catch {
      // Stockage refusé — navigation privée, cookies bloqués, iframe cloisonnée.
      // La fiche reste parfaitement utilisable sur la disposition par défaut ; ce
      // n'est pas un cas d'erreur à signaler au lecteur.
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(next: AssetLayout) {
    setLayout(next)
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Le choix vaut pour cette visite, il ne survivra pas au rechargement. Mieux
      // que de refuser le changement.
    }
  }

  const active = LAYOUTS.find((entry) => entry.id === layout) ?? LAYOUTS[0]!

  /*
   * ── LA COLONNE D'ACTUALITÉS S'INSÈRE DANS LE CONTENU, PAS DANS LE CADRE ─────
   *
   * Elle aurait pu être une TROISIÈME colonne du cadre — rail, contenu, actualités.
   * C'est faux pour deux raisons. La disposition « pleine largeur » n'a pas de cadre à
   * deux colonnes où l'ajouter ; et surtout, le rail et la colonne d'actualités ne
   * jouent pas dans la même catégorie : le rail est un ATTRIBUT de la fiche, réglé une
   * fois pour toutes, quand cette colonne s'ouvre et se ferme au fil de la lecture.
   *
   * Nichée dans le contenu, elle suit les trois dispositions sans qu'aucune n'ait à la
   * connaître.
   *
   * `xl:` et non `lg:` : à 1024 px, le rail prend déjà 288 pixels ; une troisième
   * colonne y laisserait moins de 400 px au graphique. En dessous du seuil, les
   * actualités passent SOUS le contenu plutôt que de disparaître — le bouton a été
   * pressé, il doit produire quelque chose.
   *
   * 18rem et non 20 : c'est la largeur EXACTE de la colonne latérale de CoinGecko
   * (288px, mesurée au navigateur), et la coque du site vient d'adopter la leur. Les
   * deux valeurs vont ensemble — 1680 de coque moins 288 de colonne laisse 1392 au
   * contenu, qui est au pixel près ce dont ils disposent.
   */
  const content =
    newsOpen && news ? (
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div className="min-w-0">{children}</div>

        {/*
          COLLANTE, DÉFILANTE EN PROPRE, ET SANS ASCENSEUR VISIBLE.

          On lit ce rail EN REGARDANT le graphique, pour rattacher un décrochage à un
          événement daté. S'il défilait avec la page, il aurait disparu au moment où l'on
          en a besoin. `top-20` le pose sous l'en-tête collant, dont la hauteur est de
          4 rem.

          ── OÙ IL S'ARRÊTE, ET POURQUOI ÇA NE SE RÈGLE PAS ICI ────────────────

          Un élément `sticky` se détache au bas de son BLOC CONTENEUR. Celui-ci est la
          grille de contenu, qui se termine avant le bandeau d'information et la section
          « À propos » de la fiche. La colonne cesse donc de suivre exactement là — sans
          qu'aucune hauteur ne soit écrite nulle part, et sans qu'un changement de
          contenu ne vienne dérégler le seuil. C'est le comportement de CoinGecko, où
          la même règle produit le même arrêt.

          ── L'ASCENSEUR EST MASQUÉ, PAS SUPPRIMÉ ───────────────────────────

          `.scrollbar-none` retire la barre du dessin, sans toucher au défilement : la
          molette, le clavier et le geste tactile fonctionnent à l'identique. C'est ce
          que fait la référence, et la raison est de composition — une barre grise de
          quinze pixels colle un second filet vertical le long d'une colonne déjà bornée
          par le sien, et l'œil lit deux séparateurs là où il n'y a qu'une colonne.

          CoinGecko va plus loin et coupe carrément le débordement (`overflow: hidden`),
          ce qui tronque le contenu qui dépasse. On ne les suit pas jusque-là : nos
          articles seraient PERDUS, alors qu'ils restent ici atteignables à la molette.
        */}
        <aside
          aria-label="Actualités de l'actif"
          className="scrollbar-none min-w-0 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1"
        >
          {news}
        </aside>
      </div>
    ) : (
      <div className="min-w-0">{children}</div>
    )

  return (
    <>
      {/* ── UNE SEULE RANGÉE POUR LE SOMMAIRE ET LES COMMANDES ─────────────────

          Les onglets à gauche, les réglages de page à droite, un filet sous les deux.

          Ils occupaient deux rangées superposées, et le résultat se voyait : trente
          pixels de vide entre une barre de commandes alignée à droite et une barre
          d'onglets alignée à gauche, pour deux contrôles qui tiennent largement sur
          une ligne. Les réunir supprime le vide ET la seconde ligne horizontale.

          `items-end` : les onglets portent leur propre rembourrage bas pour loger le
          trait de sélection, les boutons non. Alignés en haut ou au centre, les deux
          groupes flotteraient à des hauteurs différentes au-dessus du même filet. */}
      <div
        ref={rootRef}
        className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border-subtle"
      >
        {tabsBar !== undefined ? <div className="min-w-0 flex-1">{tabsBar}</div> : null}

        <div className="flex items-center gap-1 pb-1.5">
        {/*
          ── BOUTON D'ACTUALITÉS ────────────────────────────────────────────────

          Il ouvre une colonne, il ne navigue pas. D'où `aria-pressed` plutôt qu'un
          lien : c'est un interrupteur à deux états, et un lecteur d'écran doit
          entendre lequel est en cours.

          Il ne se rend PAS si l'appelant n'a pas fourni de colonne — un bouton qui
          déplierait un vide serait pire que son absence.
        */}
        {news ? (
          <button
            type="button"
            onClick={() => {
              const next = !newsOpen
              setNewsOpen(next)
              try {
                window.localStorage.setItem(NEWS_KEY, next ? 'open' : 'closed')
              } catch {
                // Le choix vaut pour cette visite. Voir `choose`.
              }
            }}
            aria-pressed={newsOpen}
            title="Afficher les actualités de cet actif"
            className={`flex h-7 items-center gap-1.5 px-2 text-xs font-medium transition-colors duration-150 ${
              newsOpen
                ? 'bg-surface-muted text-ink'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
            }`}
          >
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Actualités</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          title="Choisir la disposition de la fiche"
          className={`flex h-7 items-center gap-1.5 px-2 text-xs font-medium transition-colors duration-150 ${
            open ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
          }`}
        >
          {active.icon}
          <span className="hidden sm:inline">{active.label}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-1 min-w-[16rem] rounded-dense border border-border-subtle bg-overlay p-1 shadow-overlay"
          >
            {LAYOUTS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                onClick={() => choose(entry.id)}
                className={`flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors duration-150 ${
                  entry.id === layout ? 'text-brand-strong' : 'text-ink hover:bg-surface-muted'
                }`}
              >
                <span className="mt-0.5 w-3.5 shrink-0">
                  {entry.id === layout ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
                <span className="mt-0.5 shrink-0">{entry.icon}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium">{entry.label}</span>
                  <span className="block text-[0.6875rem] text-ink-muted">{entry.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        </div>
      </div>

      {/*
        ── LES TROIS DISPOSITIONS ────────────────────────────────────────────────

        `items-start` dans les deux cas où la grille a deux colonnes : sans lui, la
        colonne courte s'étire à la hauteur de la longue, et le rail d'une paire de
        devises — qui n'a ni offre ni communauté — finirait par plusieurs centaines de
        pixels de vide. C'est aussi la classe de défaut qui a fait déborder une carte
        par-dessus le pied de page sur l'accueil ; on ne la réintroduit pas ici.
      */}
      {layout === 'wide' ? (
        <div className="space-y-4">
          {content}

          {/* Le rail passe en bandeau : ses panneaux se répartissent sur trois
              colonnes plutôt que de s'empiler sur toute la largeur, où chaque ligne
              de « libellé … valeur » ferait un mètre de blanc au milieu. */}
          <div className="[&>aside]:grid [&>aside]:grid-cols-1 [&>aside]:gap-3 [&>aside]:space-y-0 md:[&>aside]:grid-cols-2 xl:[&>aside]:grid-cols-3">
            {rail}
          </div>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 items-start gap-4 ${
            layout === 'compact'
              ? 'lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]'
              : 'lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'
          }`}
        >
          {rail}
          {content}
        </div>
      )}
    </>
  )
}
