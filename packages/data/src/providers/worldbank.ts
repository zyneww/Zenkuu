import { createHttpClient } from '../http'
import { ProviderError } from '../types'

/**
 * INDICATEURS MACROÉCONOMIQUES PAR PAYS — API de la Banque mondiale.
 *
 * ── POURQUOI CETTE SOURCE ET PAS UNE AUTRE ────────────────────────────────────
 *
 * Elle est publique, sans clé, sans quota annoncé, et surtout : ses séries sont
 * DOCUMENTÉES et harmonisées entre pays. C'est le point qui décide, parce qu'une
 * carte macro compare des pays entre eux — et comparer une inflation calculée sur
 * un panier français avec une inflation calculée sur un panier argentin par une
 * autre méthode ne compare rien.
 *
 * ── CE QU'ELLE NE PEUT PAS DONNER, ET IL FAUT LE DIRE ─────────────────────────
 *
 * Une donnée ANNUELLE, et publiée avec retard. L'inflation d'un pays y est celle de
 * l'année civile close, pas celle du mois dernier ; certains pays ont un an de plus
 * de retard que d'autres. Chaque valeur porte donc son ANNÉE, et l'interface doit
 * l'afficher — sans elle, deux pays côte à côte peuvent décrire deux moments
 * différents sans que rien ne le signale (§5).
 *
 * C'est aussi ce qui distingue cette page d'une carte macro de plateforme de
 * trading : celles-ci affichent des taux directeurs à la journée, obtenus par des
 * abonnements payants. Nous affichons ce qui est vérifiable et gratuit, en le
 * nommant pour ce qu'il est.
 *
 * ── UN APPEL PAR INDICATEUR, POUR TOUS LES PAYS ───────────────────────────────
 *
 * `country/all` rend les 265 entités en une requête. C'est ce qui rend la page
 * tenable : une requête par pays en ferait deux cent soixante-cinq.
 */

const PROVIDER_ID = 'worldbank'

export const WORLDBANK_SOURCE = {
  label: 'Banque mondiale',
  attributionUrl: 'https://data.worldbank.org/',
} as const

/*
 * `/v2/fr` ET NON `/v2` — la source publie ses libellés en français.
 *
 * C'est le détail qui évite une table de traduction maison de deux cents pays et de
 * sept régions. Une telle table aurait été fausse dès le premier changement de nom —
 * la Turquie est devenue « Türkiye » dans les catalogues internationaux en 2022, la
 * Macdoine du Nord en 2019 — et personne ne l'aurait remarqué avant de lire la carte.
 * En passant par le préfixe de langue, c'est la source qui tient le libellé, et elle
 * le corrige pour nous.
 *
 * Les codes ISO et le discriminant d'agrégat (`region.id === 'NA'`) sont identiques
 * dans les deux langues : rien d'autre ne change.
 */
const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.worldbank.org/v2/fr',
  /*
   * La Banque mondiale ne publie AUCUN quota, et le débit obtenu en pratique est
   * confortable. Le plafond posé ici n'est donc pas une contrainte de la source mais
   * une prudence de notre côté : une page qui appelle cinq indicateurs à la suite doit
   * rester loin de tout seuil qu'un serveur public pourrait appliquer sans le dire.
   *
   * Le vrai garde-fou est ailleurs : ces séries sont ANNUELLES, et le cache applicatif
   * les garde six heures (voir `getMacroIndicator`). En régime normal, cette source
   * est interrogée quelques fois par jour.
   */
  maxRequestsPerWindow: 30,
  /* Les réponses font plusieurs centaines de kilo-octets et changent une fois par an :
     le cache HTTP de Next.js n'a rien à y gagner, et le cache applicatif prend le
     relais avec un TTL bien plus long. */
  bypassNextCache: true,
  /*
   * ── UN ÉCHEC RAPIDE PLUTÔT QU'UNE PAGE QUI ATTEND ────────────────────────
   *
   * Ce service RÉPOND MAL PAR MOMENTS, et c'est mesuré : des séries qui rendent 265
   * lignes en une seconde, puis des 502 sur TOUTES les séries pendant plusieurs
   * minutes — y compris celles qui venaient de fonctionner. Ce n'est donc pas un
   * indicateur cassé, c'est un serveur public qui plie sous la charge.
   *
   * Avec les valeurs par défaut, une panne coûtait vingt et une secondes d'attente
   * avant l'état vide — dix pour le délai, dix pour la reprise. Relevé sur
   * `/macro?indicateur=dette`. C'est le pire des deux mondes : le lecteur attend, et
   * il finit quand même par lire « indisponible ».
   *
   * Huit secondes, sans reprise. La reprise part en premier parce qu'elle ne sert à
   * rien ici : quand ce service tombe, il tombe pour plusieurs minutes, pas pour une
   * requête. Les reprises après 429 et 5xx restent actives — elles sont immédiates.
   */
  timeoutMs: 8_000,
  retryOnTimeout: false,
})

/**
 * ── LES THÈMES, ET POURQUOI LE CATALOGUE EN A BESOIN ─────────────────────────
 *
 * Cinq indicateurs tenaient dans une rangée de boutons. Quarante-cinq n'y tiennent
 * pas, et une liste plate de quarante-cinq lignes ne se parcourt pas mieux qu'une
 * rangée qui déborde — elle se parcourt plus mal, parce qu'on y cherche sans savoir
 * ce qui existe.
 *
 * Le thème donne au champ de recherche une STRUCTURE DE REPLI : tant qu'on n'a rien
 * tapé, la liste montre sept en-têtes et ce qu'ils contiennent, ce qui répond à
 * « qu'est-ce que vous avez ? » avant qu'on ait su formuler « je cherche ceci ».
 */
export const MACRO_THEMES = [
  { id: 'prix', label: 'Prix & monnaie' },
  { id: 'activite', label: 'Croissance & production' },
  { id: 'travail', label: 'Emploi & population' },
  { id: 'budget', label: 'Finances publiques' },
  { id: 'echanges', label: 'Commerce extérieur' },
  { id: 'energie', label: 'Énergie & environnement' },
  { id: 'societe', label: 'Développement humain' },
] as const

export type MacroThemeId = (typeof MACRO_THEMES)[number]['id']

/**
 * Le catalogue des séries cartographiables.
 *
 * ── CE QUE LA BANQUE MONDIALE PERMET, ET CE QU'ELLE NE PERMET PAS ────────────
 *
 * Une nuance doit être dite d'emblée : le « taux d'intérêt » des plateformes de
 * trading est le TAUX DIRECTEUR de la banque centrale, publié à la journée et vendu
 * par abonnement. La Banque mondiale publie un taux d'intérêt RÉEL — le taux prêteur
 * diminué de l'inflation — qui est une grandeur différente, annuelle, et gratuite. Le
 * libellé le nomme précisément plutôt que d'emprunter le nom de l'autre. La même
 * prudence vaut pour tout ce catalogue : chaque `hint` dit ce que la série mesure
 * VRAIMENT, y compris quand cela déçoit l'attente que son nom crée.
 *
 * ── LES CINQ PREMIERS IDENTIFIANTS NE BOUGENT PAS ────────────────────────────
 *
 * `inflation`, `chomage`, `croissance`, `dette` et `interets` vivent dans des URLs
 * déjà indexées (`/macro?indicateur=…`). Ils gardent leur identifiant, quelle que
 * soit la place qu'ils prennent dans la liste.
 *
 * ── LA COUVERTURE PAYS EST TRÈS INÉGALE, ET C'EST NORMAL ─────────────────────
 *
 * Certaines séries couvrent 190 pays, d'autres 60. Une carte à moitié grise n'est pas
 * une panne : c'est ce que la source publie. Le décompte affiché sous le curseur
 * temporel est là pour que cela se lise comme un fait plutôt que comme un défaut.
 */
export const MACRO_INDICATORS = [
  /* ── Prix & monnaie ────────────────────────────────────────────────────── */
  {
    id: 'inflation',
    code: 'FP.CPI.TOTL.ZG',
    label: 'Inflation',
    unit: '%',
    hint: 'Hausse des prix à la consommation sur l’année, telle que publiée par chaque institut national et harmonisée par la Banque mondiale.',
    /** Sens de lecture : une valeur haute est-elle plutôt bonne ou mauvaise ? */
    tone: 'high-bad',
    theme: 'prix',
    /** Mise en forme de la valeur — voir `formatMacroValue`. */
    scale: 'percent',
    /** Synonymes et sigles, pour que la recherche trouve ce qu'on tape vraiment. */
    keywords: ['prix', 'ipc', 'cpi', 'hausse des prix', 'coût de la vie'],
  },
  {
    id: 'deflateur',
    code: 'NY.GDP.DEFL.KD.ZG',
    label: 'Inflation (déflateur du PIB)',
    unit: '%',
    hint: 'Inflation mesurée sur l’ensemble de la production nationale, et non sur le seul panier de consommation. Elle intègre l’investissement et les exportations, d’où des écarts marqués avec l’IPC chez les pays exportateurs de matières premières.',
    tone: 'high-bad',
    theme: 'prix',
    scale: 'percent',
    keywords: ['déflateur', 'pib', 'inflation large'],
  },
  {
    id: 'interets',
    code: 'FR.INR.RINR',
    label: 'Taux d’intérêt réel',
    unit: '%',
    hint: 'Taux prêteur diminué de l’inflation. Ce n’est PAS le taux directeur de la banque centrale, que la Banque mondiale ne publie pas.',
    tone: 'neutral',
    theme: 'prix',
    scale: 'percent',
    keywords: ['taux', 'réel', 'intérêt'],
  },
  {
    id: 'taux-preteur',
    code: 'FR.INR.LEND',
    label: 'Taux prêteur',
    unit: '%',
    hint: 'Taux auquel les banques prêtent au secteur privé, avant correction de l’inflation. Il reflète le coût nominal du crédit, pas la politique monétaire.',
    tone: 'high-bad',
    theme: 'prix',
    scale: 'percent',
    keywords: ['crédit', 'emprunt', 'banque'],
  },
  {
    id: 'taux-depot',
    code: 'FR.INR.DPST',
    label: 'Taux de dépôt',
    unit: '%',
    hint: 'Rémunération nominale des dépôts bancaires. Comparé à l’inflation de la même année, il dit si l’épargne se conserve ou s’érode.',
    tone: 'high-good',
    theme: 'prix',
    scale: 'percent',
    keywords: ['épargne', 'dépôt', 'rémunération'],
  },
  {
    id: 'masse-monetaire',
    code: 'FM.LBL.BMNY.GD.ZS',
    label: 'Masse monétaire',
    unit: '% du PIB',
    hint: 'Agrégat monétaire large rapporté au PIB — une mesure de la profondeur du système financier plutôt que de la création monétaire récente.',
    tone: 'neutral',
    theme: 'prix',
    scale: 'percent',
    keywords: ['m2', 'monnaie', 'liquidité'],
  },

  /* ── Croissance & production ───────────────────────────────────────────── */
  {
    id: 'croissance',
    code: 'NY.GDP.MKTP.KD.ZG',
    label: 'Croissance du PIB',
    unit: '%',
    hint: 'Variation annuelle du produit intérieur brut en volume, donc corrigée de l’inflation.',
    tone: 'high-good',
    theme: 'activite',
    scale: 'percent',
    keywords: ['pib', 'gdp', 'croissance', 'récession'],
  },
  {
    id: 'pib',
    code: 'NY.GDP.MKTP.CD',
    label: 'PIB',
    unit: '$US',
    hint: 'Produit intérieur brut en dollars courants, converti au taux de change officiel. La conversion rend la comparaison entre pays sensible aux mouvements de change.',
    tone: 'high-good',
    theme: 'activite',
    scale: 'compact',
    keywords: ['pib', 'gdp', 'taille économie'],
  },
  {
    id: 'pib-habitant',
    code: 'NY.GDP.PCAP.CD',
    label: 'PIB par habitant',
    unit: '$US',
    hint: 'PIB rapporté à la population, en dollars courants. C’est une moyenne : elle ne dit rien de la répartition, que l’indice de Gini mesure séparément.',
    tone: 'high-good',
    theme: 'activite',
    scale: 'compact',
    keywords: ['richesse', 'niveau de vie', 'par tête'],
  },
  {
    id: 'pib-habitant-ppa',
    code: 'NY.GDP.PCAP.PP.CD',
    label: 'PIB par habitant (PPA)',
    unit: '$ int.',
    hint: 'Même grandeur, corrigée des écarts de prix entre pays. C’est la comparaison de pouvoir d’achat, et elle rapproche fortement les pays à bas coûts des pays riches.',
    tone: 'high-good',
    theme: 'activite',
    scale: 'compact',
    keywords: ['ppa', 'ppp', 'pouvoir achat', 'parité'],
  },
  {
    id: 'croissance-habitant',
    code: 'NY.GDP.PCAP.KD.ZG',
    label: 'Croissance par habitant',
    unit: '%',
    hint: 'Croissance du PIB nette de la croissance démographique. C’est celle qui dit si le niveau de vie moyen progresse — un pays peut croître de 2 % et s’appauvrir par tête.',
    tone: 'high-good',
    theme: 'activite',
    scale: 'percent',
    keywords: ['par tête', 'niveau de vie'],
  },
  {
    id: 'industrie',
    code: 'NV.IND.MANF.ZS',
    label: 'Industrie manufacturière',
    unit: '% du PIB',
    hint: 'Valeur ajoutée de l’industrie manufacturière rapportée au PIB. Une part faible peut signaler une désindustrialisation comme une économie de services mature.',
    tone: 'neutral',
    theme: 'activite',
    scale: 'percent',
    keywords: ['manufacture', 'usine', 'secondaire'],
  },
  {
    id: 'services',
    code: 'NV.SRV.TOTL.ZS',
    label: 'Services',
    unit: '% du PIB',
    hint: 'Valeur ajoutée des services rapportée au PIB — commerce, transport, finance, administration.',
    tone: 'neutral',
    theme: 'activite',
    scale: 'percent',
    keywords: ['tertiaire', 'services'],
  },
  {
    id: 'agriculture',
    code: 'NV.AGR.TOTL.ZS',
    label: 'Agriculture',
    unit: '% du PIB',
    hint: 'Valeur ajoutée de l’agriculture, de la sylviculture et de la pêche. Une part élevée accompagne généralement un PIB par habitant faible.',
    tone: 'neutral',
    theme: 'activite',
    scale: 'percent',
    keywords: ['primaire', 'agricole', 'pêche'],
  },
  {
    id: 'investissement',
    code: 'NE.GDI.TOTL.ZS',
    label: 'Investissement',
    unit: '% du PIB',
    hint: 'Formation brute de capital — machines, bâtiments, stocks. C’est ce que l’économie consacre à sa capacité future plutôt qu’à sa consommation présente.',
    tone: 'high-good',
    theme: 'activite',
    scale: 'percent',
    keywords: ['capital', 'fbcf', 'investissement'],
  },
  {
    id: 'consommation',
    code: 'NE.CON.PRVT.ZS',
    label: 'Consommation des ménages',
    unit: '% du PIB',
    hint: 'Dépense finale des ménages rapportée au PIB. Symétrique de l’investissement et des exportations : les trois ne peuvent pas être élevés ensemble.',
    tone: 'neutral',
    theme: 'activite',
    scale: 'percent',
    keywords: ['ménages', 'consommation', 'demande'],
  },

  /* ── Emploi & population ───────────────────────────────────────────────── */
  {
    id: 'chomage',
    code: 'SL.UEM.TOTL.ZS',
    label: 'Chômage',
    unit: '%',
    hint: 'Part de la population active sans emploi, estimation harmonisée du Bureau international du travail. Elle peut différer du chiffre national, qui suit d’autres définitions.',
    tone: 'high-bad',
    theme: 'travail',
    scale: 'percent',
    keywords: ['emploi', 'chômage', 'sans emploi'],
  },
  {
    id: 'chomage-jeunes',
    code: 'SL.UEM.1524.ZS',
    label: 'Chômage des jeunes',
    unit: '%',
    hint: 'Chômage des 15-24 ans. Il vaut typiquement deux à trois fois le taux général, et son écart au taux général en dit plus que son niveau.',
    tone: 'high-bad',
    theme: 'travail',
    scale: 'percent',
    keywords: ['jeunes', '15-24', 'insertion'],
  },
  {
    id: 'activite-population',
    code: 'SL.TLF.CACT.ZS',
    label: 'Taux d’activité',
    unit: '%',
    hint: 'Part des 15 ans et plus qui travaillent ou cherchent un emploi. Un chômage bas accompagné d’un taux d’activité bas décrit une population qui a cessé de chercher.',
    tone: 'high-good',
    theme: 'travail',
    scale: 'percent',
    keywords: ['activité', 'population active', 'participation'],
  },
  {
    id: 'population',
    code: 'SP.POP.TOTL',
    label: 'Population',
    unit: 'hab.',
    hint: 'Population totale au milieu de l’année, toutes résidences comptées quel que soit le statut juridique.',
    tone: 'neutral',
    theme: 'travail',
    scale: 'compact',
    keywords: ['habitants', 'démographie', 'population'],
  },
  {
    id: 'croissance-population',
    code: 'SP.POP.GROW',
    label: 'Croissance démographique',
    unit: '%',
    hint: 'Variation annuelle de la population, migrations comprises. C’est le terme qu’il faut retrancher de la croissance du PIB pour lire le niveau de vie.',
    tone: 'neutral',
    theme: 'travail',
    scale: 'percent',
    keywords: ['natalité', 'démographie'],
  },
  {
    id: 'urbanisation',
    code: 'SP.URB.TOTL.IN.ZS',
    label: 'Population urbaine',
    unit: '%',
    hint: 'Part de la population vivant en zone urbaine, selon la définition de chaque institut national — ce qui limite la comparabilité entre pays.',
    tone: 'neutral',
    theme: 'travail',
    scale: 'percent',
    keywords: ['ville', 'urbain', 'urbanisation'],
  },
  {
    id: 'seniors',
    code: 'SP.POP.65UP.TO.ZS',
    label: 'Population de 65 ans et plus',
    unit: '%',
    hint: 'Part des 65 ans et plus. C’est l’indicateur qui anticipe le mieux la pression future sur les finances publiques et le marché du travail.',
    tone: 'neutral',
    theme: 'travail',
    scale: 'percent',
    keywords: ['vieillissement', 'retraite', 'âge'],
  },

  /* ── Finances publiques ────────────────────────────────────────────────── */
  {
    id: 'dette',
    code: 'GC.DOD.TOTL.GD.ZS',
    label: 'Dette publique',
    unit: '% du PIB',
    hint: 'Dette de l’administration centrale rapportée au PIB. Elle exclut les collectivités locales et la sécurité sociale, et se compare donc mal aux chiffres de Maastricht.',
    tone: 'high-bad',
    theme: 'budget',
    scale: 'percent',
    keywords: ['dette', 'endettement', 'état'],
  },
  {
    id: 'depenses-publiques',
    code: 'GC.XPN.TOTL.GD.ZS',
    label: 'Dépenses publiques',
    unit: '% du PIB',
    hint: 'Dépense de l’administration centrale hors acquisition d’actifs, rapportée au PIB. Périmètre central uniquement, comme la dette ci-dessus.',
    tone: 'neutral',
    theme: 'budget',
    scale: 'percent',
    keywords: ['dépense', 'budget', 'état'],
  },
  {
    id: 'recettes-publiques',
    code: 'GC.REV.XGRT.GD.ZS',
    label: 'Recettes publiques',
    unit: '% du PIB',
    hint: 'Recettes de l’administration centrale hors dons extérieurs, rapportées au PIB. Comparée aux dépenses, elle donne le solde budgétaire.',
    tone: 'neutral',
    theme: 'budget',
    scale: 'percent',
    keywords: ['recettes', 'budget'],
  },
  {
    id: 'pression-fiscale',
    code: 'GC.TAX.TOTL.GD.ZS',
    label: 'Pression fiscale',
    unit: '% du PIB',
    hint: 'Recettes fiscales rapportées au PIB. Elle exclut les cotisations sociales, ce qui la rend nettement plus basse que le « taux de prélèvements obligatoires » national.',
    tone: 'neutral',
    theme: 'budget',
    scale: 'percent',
    keywords: ['impôt', 'fiscalité', 'taxe'],
  },
  {
    id: 'defense',
    code: 'MS.MIL.XPND.GD.ZS',
    label: 'Dépenses militaires',
    unit: '% du PIB',
    hint: 'Dépenses de défense rapportées au PIB, d’après le SIPRI. Périmètre plus large que le seul budget des armées : pensions et forces paramilitaires comprises.',
    tone: 'neutral',
    theme: 'budget',
    scale: 'percent',
    keywords: ['défense', 'armée', 'militaire', 'sipri'],
  },

  /* ── Commerce extérieur ────────────────────────────────────────────────── */
  {
    id: 'balance-courante',
    code: 'BN.CAB.XOKA.GD.ZS',
    label: 'Balance courante',
    unit: '% du PIB',
    hint: 'Solde des échanges de biens, services et revenus avec le reste du monde. Un déficit durable se finance par de la dette extérieure ou des cessions d’actifs.',
    tone: 'high-good',
    theme: 'echanges',
    scale: 'percent',
    keywords: ['balance', 'courant', 'déficit', 'excédent'],
  },
  {
    id: 'exportations',
    code: 'NE.EXP.GNFS.ZS',
    label: 'Exportations',
    unit: '% du PIB',
    hint: 'Exportations de biens et services rapportées au PIB. Les places de réexportation et les petites économies ouvertes y dépassent parfois 100 %.',
    tone: 'high-good',
    theme: 'echanges',
    scale: 'percent',
    keywords: ['export', 'exportations', 'vente'],
  },
  {
    id: 'importations',
    code: 'NE.IMP.GNFS.ZS',
    label: 'Importations',
    unit: '% du PIB',
    hint: 'Importations de biens et services rapportées au PIB. Lue seule elle ne dit rien : c’est son écart aux exportations qui fait le solde.',
    tone: 'neutral',
    theme: 'echanges',
    scale: 'percent',
    keywords: ['import', 'importations', 'achat'],
  },
  {
    id: 'ouverture',
    code: 'NE.TRD.GNFS.ZS',
    label: 'Ouverture commerciale',
    unit: '% du PIB',
    hint: 'Somme des exportations et des importations rapportée au PIB — la mesure usuelle de l’exposition d’une économie au commerce mondial.',
    tone: 'neutral',
    theme: 'echanges',
    scale: 'percent',
    keywords: ['ouverture', 'commerce', 'mondialisation'],
  },
  {
    id: 'ide',
    code: 'BX.KLT.DINV.WD.GD.ZS',
    label: 'Investissements directs étrangers',
    unit: '% du PIB',
    hint: 'Entrées nettes d’investissement direct étranger. Les places financières y affichent des montants sans rapport avec leur économie réelle, du fait des holdings de passage.',
    tone: 'high-good',
    theme: 'echanges',
    scale: 'percent',
    keywords: ['ide', 'fdi', 'investissement étranger'],
  },
  {
    id: 'reserves',
    code: 'FI.RES.TOTL.MO',
    label: 'Réserves de change',
    unit: 'mois d’imports',
    hint: 'Réserves officielles exprimées en mois d’importations couvertes. Trois mois est le seuil de prudence usuellement retenu par le FMI.',
    tone: 'high-good',
    theme: 'echanges',
    scale: 'plain',
    keywords: ['réserves', 'change', 'devises', 'fmi'],
  },

  /* ── Énergie & environnement ───────────────────────────────────────────── */
  {
    id: 'electricite',
    code: 'EG.ELC.ACCS.ZS',
    label: 'Accès à l’électricité',
    unit: '%',
    hint: 'Part de la population raccordée à l’électricité. Au-dessus de 99 %, la série cesse d’être informative — elle sert à lire l’Afrique subsaharienne et l’Asie du Sud.',
    tone: 'high-good',
    theme: 'energie',
    scale: 'percent',
    keywords: ['électricité', 'énergie', 'accès'],
  },
  {
    id: 'renouvelables',
    code: 'EG.FEC.RNEW.ZS',
    label: 'Énergies renouvelables',
    unit: '% de la consommation',
    hint: 'Part des renouvelables dans la consommation finale d’énergie. Attention au contresens : les valeurs les plus hautes sont celles des pays où l’on brûle de la biomasse faute d’autre chose.',
    tone: 'neutral',
    theme: 'energie',
    scale: 'percent',
    keywords: ['renouvelable', 'vert', 'énergie', 'biomasse'],
  },
  {
    id: 'electricite-renouvelable',
    code: 'EG.ELC.RNEW.ZS',
    label: 'Électricité renouvelable',
    unit: '% de la production',
    hint: 'Part des renouvelables dans la production électrique, hydraulique comprise — ce qui place en tête les pays montagneux plutôt que les pays équipés en éolien et solaire.',
    tone: 'high-good',
    theme: 'energie',
    scale: 'percent',
    keywords: ['hydraulique', 'solaire', 'éolien', 'électricité'],
  },
  {
    id: 'energie-habitant',
    code: 'EG.USE.PCAP.KG.OE',
    label: 'Consommation d’énergie',
    unit: 'kep/hab.',
    hint: 'Énergie primaire consommée par habitant, en kilogrammes d’équivalent pétrole. Elle suit de très près le PIB par habitant et le climat.',
    tone: 'neutral',
    theme: 'energie',
    scale: 'compact',
    keywords: ['énergie', 'consommation', 'pétrole'],
  },

  /* ── Développement humain ──────────────────────────────────────────────── */
  {
    id: 'esperance-vie',
    code: 'SP.DYN.LE00.IN',
    label: 'Espérance de vie',
    unit: 'ans',
    hint: 'Espérance de vie à la naissance, tous sexes confondus, aux conditions de mortalité de l’année observée.',
    tone: 'high-good',
    theme: 'societe',
    scale: 'plain',
    keywords: ['santé', 'longévité', 'mortalité'],
  },
  {
    id: 'fecondite',
    code: 'SP.DYN.TFRT.IN',
    label: 'Indice de fécondité',
    unit: 'enfants/femme',
    hint: 'Nombre d’enfants qu’aurait une femme aux taux de fécondité de l’année. Le seuil de renouvellement des générations est d’environ 2,1.',
    tone: 'neutral',
    theme: 'societe',
    scale: 'plain',
    keywords: ['natalité', 'fécondité', 'naissances'],
  },
  {
    id: 'sante',
    code: 'SH.XPD.CHEX.GD.ZS',
    label: 'Dépenses de santé',
    unit: '% du PIB',
    hint: 'Dépense courante de santé, publique et privée confondues, rapportée au PIB.',
    tone: 'neutral',
    theme: 'societe',
    scale: 'percent',
    keywords: ['santé', 'hôpital', 'soins'],
  },
  {
    id: 'education',
    code: 'SE.XPD.TOTL.GD.ZS',
    label: 'Dépenses d’éducation',
    unit: '% du PIB',
    hint: 'Dépense publique d’éducation rapportée au PIB, du primaire au supérieur. La part privée n’y figure pas.',
    tone: 'high-good',
    theme: 'societe',
    scale: 'percent',
    keywords: ['école', 'éducation', 'enseignement'],
  },
  {
    id: 'internet',
    code: 'IT.NET.USER.ZS',
    label: 'Usage d’Internet',
    unit: '% de la population',
    hint: 'Part de la population ayant utilisé Internet au cours des trois derniers mois, d’après les enquêtes nationales relayées par l’UIT.',
    tone: 'high-good',
    theme: 'societe',
    scale: 'percent',
    keywords: ['internet', 'numérique', 'connexion'],
  },
  {
    id: 'mobile',
    code: 'IT.CEL.SETS.P2',
    label: 'Abonnements mobiles',
    unit: 'pour 100 hab.',
    hint: 'Abonnements de téléphonie mobile pour cent habitants. Le dépassement de 100 est courant : il compte les cartes, pas les personnes.',
    tone: 'neutral',
    theme: 'societe',
    scale: 'plain',
    keywords: ['mobile', 'téléphone', 'sim'],
  },
  {
    id: 'gini',
    code: 'SI.POV.GINI',
    label: 'Indice de Gini',
    unit: '',
    hint: 'Inégalité des revenus, de 0 (égalité parfaite) à 100. Publié de façon très irrégulière : la plupart des pays n’ont qu’une observation tous les trois à cinq ans.',
    tone: 'high-bad',
    theme: 'societe',
    scale: 'plain',
    keywords: ['inégalité', 'gini', 'revenus', 'pauvreté'],
  },
] as const

export type MacroIndicatorId = (typeof MACRO_INDICATORS)[number]['id']

export type MacroIndicator = (typeof MACRO_INDICATORS)[number]

/**
 * Mise en forme d'une valeur macroéconomique, selon l'échelle de sa série.
 *
 * ── POURQUOI UNE SEULE FONCTION POUR QUARANTE-CINQ SÉRIES ────────────────────
 *
 * Le catalogue mêle désormais des pourcentages (inflation : 3,2), des grandeurs
 * absolues énormes (PIB : 2 800 000 000 000) et de petits nombres nus (fécondité :
 * 1,8). Les passer tous par le `toFixed(1)` d'origine donnerait
 * « 2800000000000,0 » sur la carte du PIB.
 *
 * Le choix de l'échelle appartient à la SÉRIE et non à l'appelant : c'est une
 * propriété de la donnée, connue une fois pour toutes ici, et non une décision que
 * chaque composant d'affichage devrait reprendre à son compte.
 */
export function formatMacroValue(
  value: number,
  scale: 'percent' | 'compact' | 'plain',
  locale = 'fr-FR',
): string {
  if (scale === 'compact') {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: Math.abs(value) < 100 ? 1 : 0,
    }).format(value)
  }

  /* Une décimale sous 100, aucune au-delà : « 3,2 % » et « 1 240 » se lisent, alors
     que « 3 % » perd l'information et « 1 240,0 » en invente une. */
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Math.abs(value) < 100 ? 1 : 0,
    maximumFractionDigits: Math.abs(value) < 100 ? 1 : 0,
  }).format(value)
}

export interface MacroObservation {
  /** Code ISO 3166-1 alpha-3 — `FRA`, `USA`. */
  iso3: string
  country: string
  /** Région Banque mondiale, pour le regroupement géographique. */
  region: string
  /** Année de l'observation. Elle DIFFÈRE d'un pays à l'autre — voir l'en-tête. */
  year: number
  value: number
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SÉRIE COMPACTÉE — la même donnée, quatre fois plus légère sur le fil
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE PROBLÈME QU'ELLE RÈGLE ────────────────────────────────────────────────
 *
 * La carte macro est un composant CLIENT : ses observations traversent la frontière
 * serveur → navigateur et se retrouvent, sérialisées, dans la charge utile de chaque
 * chargement de `/macro`. Tant que l'historique tenait sur quinze ans, cela faisait
 * trois mille lignes et personne ne s'en apercevait.
 *
 * L'historique remonte désormais à 1960 — soixante-six ans — et la même série en compte
 * près de dix mille. Sous forme d'objets nommés, chacune répète son code pays, le NOM
 * COMPLET du pays et le NOM DE SA RÉGION : « France » et « Europe & Central Asia » sont
 * réécrits soixante-six fois, une par année. Mesuré sur l'inflation, la charge utile
 * passait de deux cents kilo-octets à plus de huit cents.
 *
 * ── CE QUE FAIT L'ENCODAGE ───────────────────────────────────────────────────
 *
 * Les pays sont listés UNE FOIS, et chaque observation ne porte plus qu'un index dans
 * cette liste. Un triplet de nombres remplace un objet de cinq champs :
 *
 *     avant  {"iso3":"FRA","country":"France","region":"Europe & Central Asia",
 *             "year":2024,"value":2.31}                              ~95 octets
 *     après  [42,2024,2.31]                                          ~15 octets
 *
 * ── POURQUOI PAS UNE PAGINATION, OU UN CHARGEMENT À LA DEMANDE ───────────────
 *
 * Parce que le curseur temporel doit rester INSTANTANÉ. C'est sa raison d'être : on le
 * déplace pour comparer, et une comparaison qui attend un aller-retour réseau par cran
 * n'est plus une comparaison. Toute la période doit donc être en mémoire, et la seule
 * variable sur laquelle on puisse jouer est le poids de sa représentation.
 *
 * ── LE CODEC EST PUR, ET C'EST CE QUI LE REND TESTABLE ───────────────────────
 *
 * `unpack(pack(x))` doit rendre exactement `x`. Les deux fonctions vivent donc ici,
 * côte à côte, plutôt qu'à leurs deux extrémités — un encodeur et un décodeur écrits
 * dans deux fichiers différents finissent par diverger d'un champ.
 */
export interface PackedMacroSeries {
  /** Pays cités par la série, dans l'ordre de première apparition. */
  countries: { iso3: string; name: string; region: string }[]
  /** `[index du pays, année, valeur]`, un triplet par observation. */
  rows: [number, number, number][]
}

export function packMacroSeries(observations: MacroObservation[]): PackedMacroSeries {
  const index = new Map<string, number>()
  const countries: PackedMacroSeries['countries'] = []
  const rows: [number, number, number][] = []

  for (const row of observations) {
    let position = index.get(row.iso3)
    if (position === undefined) {
      position = countries.length
      index.set(row.iso3, position)
      countries.push({ iso3: row.iso3, name: row.country, region: row.region })
    }
    rows.push([position, row.year, row.value])
  }

  return { countries, rows }
}

export function unpackMacroSeries(series: PackedMacroSeries): MacroObservation[] {
  const out: MacroObservation[] = []

  for (const [position, year, value] of series.rows) {
    const country = series.countries[position]
    // Un index hors liste ne peut venir que d'une charge utile corrompue. On écarte la
    // ligne plutôt que de fabriquer un pays « inconnu » : une observation sans pays
    // n'est pas une observation (§5).
    if (!country) continue
    out.push({
      iso3: country.iso3,
      country: country.name,
      region: country.region,
      year,
      value,
    })
  }

  return out
}

/* ── Forme brute ─────────────────────────────────────────────────────────── */

interface RawCountry {
  id: string
  iso2Code: string
  name: string
  region: { id: string; value: string }
}

interface RawObservation {
  countryiso3code: string
  country: { value: string }
  date: string
  value: number | null
}

/**
 * Catalogue des pays, et le filtre qui écarte les AGRÉGATS.
 *
 * La réponse mêle des pays et des ensembles — « Monde arabe », « Zone euro »,
 * « Revenu élevé ». Les laisser passer mettrait « Union européenne » à côté de
 * « France » dans un classement, où elle écraserait tout sans être comparable.
 *
 * La Banque mondiale les marque d'une région `NA`, ce qui est exactement le
 * discriminant qu'il faut : il vient de la source et se corrige avec elle, à la
 * différence d'une liste de codes écrite à la main qui se périmerait au premier
 * ensemble ajouté.
 */
async function fetchCountries(): Promise<Map<string, { name: string; region: string }>> {
  const body = await http.getJson<[unknown, RawCountry[] | null]>(
    '/country?format=json&per_page=400',
  )

  const rows = body?.[1]
  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, 'Catalogue de pays illisible', { retryable: true })
  }

  const map = new Map<string, { name: string; region: string }>()
  for (const row of rows) {
    if (!row?.id || row.region?.id === 'NA') continue
    map.set(row.id, { name: row.name, region: row.region?.value ?? 'Autres' })
  }

  return map
}

/**
 * Dernière observation connue de chaque pays, pour un indicateur.
 *
 * `mrv=1` — « most recent value » — laisse la source choisir l'année la plus récente
 * PAYS PAR PAYS. C'est le bon comportement : figer une année commune ferait
 * disparaître tous les pays qui ne l'ont pas encore publiée, et une carte dont un
 * tiers des pays est vide n'informe plus.
 */
/**
 * Première année publiée par la Banque mondiale, toutes séries confondues.
 *
 * 1960 est le début de l'ensemble de données — vérifié au navigateur sur l'inflation :
 * `mrv=66` rend des observations de 1960 à 2025, et la page de méta-données de l'API
 * annonce la même borne. Aucune série ne remonte plus haut.
 */
export const MACRO_FIRST_YEAR = 1960

/**
 * Profondeur d'historique demandée quand l'appelant en veut un.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * TOUTE L'HISTOIRE, ET NON PLUS QUINZE ANS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * C'était une constante à 15, défendue ainsi : « vers le haut, la réponse grossit du
 * produit pays × années — 260 × 15 tient dans une seule requête, 260 × 60 en
 * demanderait quatre et pèserait deux mégaoctets ».
 *
 * Les deux moitiés de la phrase étaient fausses, et la mesure les a tranchées :
 *
 *   · UNE SEULE REQUÊTE suffit. La pagination de la Banque mondiale se règle par
 *     `per_page`, qui accepte trente mille lignes ; la réponse complète de l'inflation
 *     en compte 17 490, annoncées `"pages": 1`. Aucune pagination n'a lieu.
 *
 *   · DEUX MÉGAOCTETS, c'était le poids de la réponse BRUTE de la source — quatre en
 *     réalité, mesurés. Ce n'est pas ce que nous transportons : les lignes nulles
 *     (six mille sur dix-sept mille) et les agrégats sont écartés à l'entrée, et ce
 *     qui traverse ensuite vers le navigateur passe par `packMacroSeries`. Le vrai
 *     chiffre est de l'ordre de cent cinquante kilo-octets.
 *
 * Ce que quinze ans coûtaient, en revanche, était réel : le curseur ne pouvait pas
 * montrer la stagflation des années soixante-dix, le choc pétrolier, la désinflation
 * des années quatre-vingt-dix — c'est-à-dire tout ce qu'un indicateur macroéconomique
 * annuel sert à regarder. Une série annuelle limitée à quinze points n'est pas une
 * série, c'est un extrait.
 *
 * ── POURQUOI UNE FONCTION ET NON UNE CONSTANTE ───────────────────────────────
 *
 * `mrv` compte les années les plus RÉCENTES, pas une borne de départ : un nombre figé
 * ferait reculer la première année d'un cran chaque 1ᵉʳ janvier. La profondeur se
 * recalcule donc depuis l'année courante, ce qui garde 1960 comme borne pour toujours.
 *
 * Elle entre dans la clé de cache de `getMacroIndicator` : le passage d'année vide
 * naturellement l'entrée de l'année précédente, ce qui est le comportement voulu.
 */
export function macroHistoryYears(): number {
  return new Date().getFullYear() - MACRO_FIRST_YEAR + 1
}

export async function fetchMacroIndicator(
  code: string,
  /**
   * Nombre d'années remontées PAR PAYS.
   *
   * `1` conserve le comportement d'origine — la dernière valeur connue de chacun, ce
   * qui suffit à une carte d'instantané. Au-delà, la réponse porte une observation par
   * pays et par année, et c'est l'appelant qui choisit celle qu'il affiche.
   *
   * Le paramètre entre dans la CLÉ DE CACHE de `getMacroIndicator` : demander
   * l'historique ne remplace donc pas l'instantané déjà mémorisé, et les pages qui
   * n'ont besoin que du dernier point ne paient pas le surcoût.
   */
  years = 1,
): Promise<MacroObservation[]> {
  /* `per_page` suit la profondeur : à quinze ans, 400 lignes ne couvriraient que
     vingt-six pays, et la source paginerait en silence — on obtiendrait une carte
     amputée sans qu'aucune erreur ne le signale. */
  const perPage = Math.max(400, years * 400)

  const [countries, body] = await Promise.all([
    fetchCountries(),
    http.getJson<[unknown, RawObservation[] | null]>(
      `/country/all/indicator/${encodeURIComponent(code)}?format=json&mrv=${years}&per_page=${perPage}`,
    ),
  ])

  const rows = body?.[1]
  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, `Indicateur ${code} illisible`, { retryable: true })
  }

  const out: MacroObservation[] = []
  for (const row of rows) {
    // Une valeur nulle signifie « non publiée » et non « zéro » : la ligne disparaît.
    if (row?.value === null || row?.value === undefined || !Number.isFinite(row.value)) continue

    const known = countries.get(row.countryiso3code)
    if (!known) continue

    const year = Number(row.date)
    if (!Number.isFinite(year)) continue

    out.push({
      iso3: row.countryiso3code,
      country: known.name,
      region: known.region,
      year,
      value: row.value,
    })
  }

  return out
}
