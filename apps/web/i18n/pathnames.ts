import { TRANSLATED_LOCALES, type TranslatedLocale } from '../components/settings/languages'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES ADRESSES PUBLIQUES, LANGUE PAR LANGUE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * next-intl distingue deux choses que le reste du code confondait : le CHEMIN INTERNE
 * — le dossier sous `app/[locale]/`, celui qu'on écrit dans un `href` — et l'ADRESSE
 * PUBLIQUE, celle qui s'affiche dans la barre du navigateur. Cette table est la
 * traduction de l'un vers l'autre.
 *
 *     href="/actions"   →   /stocks        en anglais
 *                       →   /fr/actions    en français
 *                       →   /de/actions    en allemand
 *
 * ── POURQUOI LES CHEMINS INTERNES RESTENT FRANÇAIS ───────────────────────────
 *
 * On aurait pu renommer les cinquante-huit dossiers de `app/[locale]/` en anglais et
 * traduire vers le français. Ç'aurait été un déplacement de fichiers gratuit : le
 * français est la langue SOURCE de ce dépôt — les clés de la table de phrases sont du
 * français, les commentaires aussi, les descriptions de référencement sont indexées
 * par la route française. Garder `/actions` comme identifiant interne aligne le
 * routage sur cette convention plutôt que d'en introduire une seconde.
 *
 * ── POURQUOI SEUL L'ANGLAIS EST TRADUIT ──────────────────────────────────────
 *
 * Il existe deux jeux de slugs RÉELS : le français, écrit ici depuis l'origine, et
 * l'anglais, écrit ci-dessous. Les onze autres langues n'en ont pas. En fabriquer —
 * `/ja/株式`, `/pl/akcje` — demanderait de traduire cinquante-huit routes en onze
 * langues sans personne pour les relire, et une adresse est ce qu'un site a de plus
 * durable : une faute d'orthographe dans un slug se corrige par une redirection
 * permanente, pas par une retouche.
 *
 * Les onze gardent donc le chemin interne. `/de/actions` n'est pas de l'allemand,
 * mais c'est une adresse STABLE et déjà indexée, ce qui vaut mieux qu'une traduction
 * approximative qu'il faudrait renier.
 *
 * ── `/embed/*` N'EST PAS TRADUIT, ET C'EST DÉLIBÉRÉ ──────────────────────────
 *
 * Ces deux routes rendent des widgets destinés à vivre dans l'iframe d'un AUTRE site.
 * Leur adresse est copiée-collée dans du HTML qui ne nous appartient pas et que nous
 * ne pouvons pas mettre à jour. Traduire `/embed/graphique` en `/embed/chart`
 * casserait chaque intégration existante en échange d'une lisibilité que personne ne
 * lit — l'adresse d'une iframe n'est visible ni du visiteur ni d'un moteur.
 */

/**
 * Décline un chemin en treize adresses : l'anglaise pour `en`, le chemin interne pour
 * les douze autres.
 *
 * Le chemin interne est répété en premier argument alors qu'il est déjà la clé de la
 * ligne. C'est voulu : la fonction ne peut pas lire sa propre clé, et l'alternative —
 * dériver la table par une boucle — ferait perdre les clés LITTÉRALES dont dépend le
 * typage de `Link`. C'est ce typage qui refuse à la compilation un `href` vers une
 * route qui n'existe pas, et il vaut la répétition.
 */
function traduit(interne: string, anglais: string): Record<TranslatedLocale, string> {
  return Object.fromEntries(
    TRANSLATED_LOCALES.map((locale) => [locale, locale === 'en' ? anglais : interne]),
  ) as Record<TranslatedLocale, string>
}

/**
 * Les cinquante-huit routes du site.
 *
 * ⚠️ TOUTE ROUTE ABSENTE D'ICI DEVIENT INATTEIGNABLE PAR `Link`. Dès que `pathnames`
 * est défini, next-intl restreint le type de `href` aux clés de cette table : une
 * page nouvelle qui n'y figure pas ne produit pas un lien cassé au moment de
 * l'exécution, elle produit une erreur de compilation. C'est l'effet recherché.
 *
 * Une ligne écrite en chaîne simple (`'/crypto': '/crypto'`) sert la même adresse
 * dans les treize langues — soit que le mot soit identique, soit qu'il n'ait pas à
 * être traduit.
 */
export const PATHNAMES = {
  '/': '/',

  '/a-propos': traduit('/a-propos', '/about'),
  '/actions': traduit('/actions', '/stocks'),
  '/actions/[id]': traduit('/actions/[id]', '/stocks/[id]'),
  '/actions/[id]/metriques/[metrique]': traduit(
    '/actions/[id]/metriques/[metrique]',
    '/stocks/[id]/metrics/[metrique]',
  ),
  '/actualites': traduit('/actualites', '/news'),
  '/aide': traduit('/aide', '/help'),
  '/aide/[slug]': traduit('/aide/[slug]', '/help/[slug]'),
  '/aide/rubrique/[id]': traduit('/aide/rubrique/[id]', '/help/topic/[id]'),
  '/bien-demarrer': traduit('/bien-demarrer', '/get-started'),

  '/categories': '/categories',
  '/categories/[id]': '/categories/[id]',

  '/classements': traduit('/classements', '/rankings'),
  '/classements/[type]': traduit('/classements/[type]', '/rankings/[type]'),
  '/comparateur': traduit('/comparateur', '/compare'),
  '/connexion': traduit('/connexion', '/login'),
  '/convertisseur': traduit('/convertisseur', '/converter'),

  '/crypto': '/crypto',
  '/crypto/[id]': '/crypto/[id]',
  '/crypto/[id]/halving': '/crypto/[id]/halving',
  '/crypto/[id]/historique': traduit('/crypto/[id]/historique', '/crypto/[id]/history'),
  '/crypto/[id]/metriques/[metrique]': traduit(
    '/crypto/[id]/metriques/[metrique]',
    '/crypto/[id]/metrics/[metrique]',
  ),

  '/derives': traduit('/derives', '/derivatives'),
  '/devises': traduit('/devises', '/currencies'),
  '/devises/[id]': traduit('/devises/[id]', '/currencies/[id]'),
  '/devises/[id]/metriques/[metrique]': traduit(
    '/devises/[id]/metriques/[metrique]',
    '/currencies/[id]/metrics/[metrique]',
  ),

  /* Voir la note d'en-tête : l'adresse d'un widget vit dans le HTML d'autrui. */
  '/embed/graphique': '/embed/graphique',
  '/embed/ticker': '/embed/ticker',

  '/etf': '/etf',
  '/etf/[id]': '/etf/[id]',
  '/etf/[id]/metriques/[metrique]': traduit(
    '/etf/[id]/metriques/[metrique]',
    '/etf/[id]/metrics/[metrique]',
  ),

  '/glossaire': traduit('/glossaire', '/glossary'),

  '/graphiques': traduit('/graphiques', '/charts'),
  '/graphiques/actifs-reels': traduit('/graphiques/actifs-reels', '/charts/real-world-assets'),
  '/graphiques/dominance': traduit('/graphiques/dominance', '/charts/dominance'),
  '/graphiques/nft': traduit('/graphiques/nft', '/charts/nft'),
  '/graphiques/saison-altcoins': traduit('/graphiques/saison-altcoins', '/charts/altcoin-season'),
  '/graphiques/tresoreries': traduit('/graphiques/tresoreries', '/charts/treasuries'),

  '/heatmap': '/heatmap',

  '/indices': '/indices',
  '/indices/[id]': '/indices/[id]',
  '/indices/[id]/metriques/[metrique]': traduit(
    '/indices/[id]/metriques/[metrique]',
    '/indices/[id]/metrics/[metrique]',
  ),

  '/inscription': traduit('/inscription', '/signup'),
  '/macro': '/macro',

  '/matieres-premieres': traduit('/matieres-premieres', '/commodities'),
  '/matieres-premieres/[id]': traduit('/matieres-premieres/[id]', '/commodities/[id]'),
  '/matieres-premieres/[id]/metriques/[metrique]': traduit(
    '/matieres-premieres/[id]/metriques/[metrique]',
    '/commodities/[id]/metrics/[metrique]',
  ),

  '/nouveautes': traduit('/nouveautes', '/changelog'),
  '/nouvelles-cotations': traduit('/nouvelles-cotations', '/new-listings'),
  '/parametres': traduit('/parametres', '/settings'),
  '/perpetuels': traduit('/perpetuels', '/perpetuals'),
  '/places': traduit('/places', '/exchanges'),
  '/places/[id]': traduit('/places/[id]', '/exchanges/[id]'),
  '/pool/[network]/[address]': '/pool/[network]/[address]',
  '/pourquoi-zenkuu': traduit('/pourquoi-zenkuu', '/why-zenkuu'),
  '/rachats': traduit('/rachats', '/buybacks'),
  '/resoudre/[terme]': traduit('/resoudre/[terme]', '/resolve/[terme]'),
  '/screener': '/screener',
  '/sentiment': '/sentiment',
  '/tableau-de-bord': traduit('/tableau-de-bord', '/dashboard'),
} as const

/**
 * Chaque route, avec son adresse anglaise — `['/actions', '/stocks']`.
 *
 * ── POURQUOI DÉRIVÉE PLUTÔT QU'ÉCRITE ────────────────────────────────────────
 *
 * `next.config.ts` en a besoin pour engendrer les redirections permanentes des
 * anciennes adresses. Une seconde liste écrite à la main divergerait de celle-ci au
 * premier ajout de route, et le symptôme serait muet : une page nouvelle atteignable,
 * mais son ancienne adresse en 404, ce que personne ne remarque avant de lire un
 * rapport d'indexation.
 *
 * Les routes dont l'anglais est identique y figurent aussi, avec les deux colonnes
 * égales : `/en/crypto` est une ancienne adresse comme les autres, et elle a besoin
 * de sa redirection vers `/crypto` même si le mot ne change pas.
 *
 * ⚠️ ELLE NE PEUT PAS VIVRE DANS `routing.ts`. `next.config.ts` importe ce
 * module-ci, et `routing.ts` appelle `defineRouting` de next-intl : l'importer depuis
 * la configuration ferait charger next-intl avant que Next n'ait démarré. Ce fichier
 * n'importe donc rien d'autre que la liste des langues.
 */
export const ROUTE_ADDRESSES: ReadonlyArray<readonly [interne: string, anglais: string]> =
  Object.entries(PATHNAMES).map(([interne, adresses]) =>
    typeof adresses === 'string' ? ([interne, adresses] as const) : ([interne, adresses.en] as const),
  )

/**
 * L'inverse de la table : d'une adresse ANGLAISE concrète vers son chemin interne.
 *
 * `/stocks/aapl/metrics/prix` → `/actions/aapl/metriques/prix`
 *
 * ── QUI EN A BESOIN, ET POURQUOI ÇA NE PEUT PAS ÊTRE UNE SUBSTITUTION ────────
 *
 * `proxy.ts` redirige vers la langue enregistrée en cookie quand l'adresse n'a pas de
 * préfixe. Une adresse sans préfixe est ANGLAISE ; les douze autres langues servent le
 * chemin interne. Passer de l'une à l'autre demande donc de traduire, et non de
 * préfixer : `/fr/stocks` n'existe pas.
 *
 * Remplacer le seul premier segment ne suffit pas — `/stocks/aapl/metrics/prix` a deux
 * segments traduits, séparés par une valeur. La correspondance se fait donc GABARIT
 * PAR GABARIT, à nombre de segments égal, chaque `[…]` acceptant une valeur qu'on
 * reporte à la même place dans le chemin interne.
 *
 * Une adresse inconnue est rendue telle quelle : le middleware la passera au routage,
 * qui répondra 404 comme il se doit. Deviner mieux ne ferait qu'inventer.
 */
export function internalFromEnglish(adresse: string): string {
  const recu = adresse.split('/')

  for (const [interne, anglais] of ROUTE_ADDRESSES) {
    const gabarit = anglais.split('/')
    if (gabarit.length !== recu.length) continue

    const valeurs: string[] = []
    const correspond = gabarit.every((segment, index) => {
      const donne = recu[index] ?? ''
      if (segment.startsWith('[')) {
        valeurs.push(donne)
        return donne.length > 0
      }
      return segment === donne
    })

    if (!correspond) continue

    let reste = 0
    return interne
      .split('/')
      .map((segment) => (segment.startsWith('[') ? (valeurs[reste++] ?? segment) : segment))
      .join('/')
  }

  return adresse
}
