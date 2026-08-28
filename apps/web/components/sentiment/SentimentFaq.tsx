import { ChevronDown } from 'lucide-react'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FAQ DE L'INDICE — CE QU'IL EST, CE QU'IL MESURE, CE QU'IL NE DIT PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE CONTENU DÉCRIT NOTRE SOURCE, PAS CELLE DE LA RÉFÉRENCE ──────────────
 *
 * La page de référence documente SA propre variante de l'indice — mouvements de
 * baleines, analyse du carnet d'ordres, algorithme d'apprentissage. ZENKUU ne relaie
 * pas cet indice-là : il relaie celui d'Alternative.me, dont les modules publiés sont
 * ceux décrits ci-dessous. Traduire la FAQ de la référence aurait produit un texte
 * qui décrit fidèlement un calcul QUI N'EST PAS CELUI DES CHIFFRES AFFICHÉS — une
 * fausse explication étant aussi trompeuse qu'une fausse donnée (§5).
 *
 * ⚠️ AUCUNE PONDÉRATION N'EST CHIFFRÉE. Alternative.me documente des poids par
 * module, mais ne diffuse PAS la contribution de chaque module au relevé du jour :
 * son API ne rend que la valeur composite. Afficher « 25 % volatilité » à côté du
 * chiffre du jour laisserait croire à une décomposition qu'on ne peut pas montrer.
 * Les modules sont donc nommés et décrits, jamais pondérés — c'est la décision déjà
 * prise par l'ancienne section « Ce que l'indice mesure », et elle est reconduite.
 *
 * ── `<details>` NATIF, PAS UN ACCORDÉON REACT ──────────────────────────────
 *
 * Même choix que `AssetFaq`, pour la même raison : la réponse reste dans le HTML
 * servi même repliée, donc lue par les moteurs de recherche sans qu'une ligne de
 * JavaScript ait à s'exécuter. Le §9 fait du référencement organique le premier
 * moteur d'acquisition ; une FAQ qui n'existe qu'après hydratation n'y contribue pas.
 */

interface Entry {
  question: string
  /** Paragraphes. Plusieurs plutôt qu'un bloc : les réponses longues se parcourent. */
  answer: string[]
}

/** Les quatre questions générales — colonne de gauche. */
const GENERAL: Entry[] = [
  {
    question: 'Qu’est-ce que l’indice de peur et d’avidité ?',
    answer: [
      'C’est une mesure du climat émotionnel du marché crypto, exprimée par un nombre entre 0 et 100. Zéro décrit un marché paralysé par la peur ; cent, un marché emporté par l’avidité.',
      'Il ne mesure ni la valeur d’un actif ni sa performance : il tente de résumer l’état d’esprit dans lequel se trouvent ceux qui achètent et vendent, à partir de signaux observables — l’agitation des cours, l’intensité des échanges, le bruit sur les réseaux.',
      'ZENKUU relaie l’indice publié par Alternative.me. Il n’est pas recalculé ici.',
    ],
  },
  {
    question: 'Comment fonctionne-t-il ?',
    answer: [
      'Plusieurs modules mesurent chacun un aspect du marché, comparent la valeur du jour à ses propres moyennes récentes, et rendent une note. Ces notes sont ensuite combinées en une valeur unique, publiée une fois par jour.',
      'Le principe commun à tous les modules est la comparaison à l’habitude : ce n’est pas une volatilité élevée dans l’absolu qui compte, mais une volatilité élevée POUR CE MARCHÉ, mesurée contre ses trente et quatre-vingt-dix derniers jours.',
    ],
  },
  {
    question: 'Comment s’en servir ?',
    answer: [
      'L’indice se lit d’abord comme un état des lieux : où se situe le marché sur l’échelle, aujourd’hui. Les zones nommées — peur extrême, peur, neutre, avidité, avidité extrême — servent de repères de lecture, pas de consignes.',
      'Il se lit ensuite dans la durée. Un 60 atteint après une semaine à 30 ne raconte pas la même chose qu’un 60 en repli depuis 85 : c’est le mouvement qui informe, plus que le niveau. C’est à cela que servent les valeurs historiques et le graphique de cette page.',
      'Une lecture prudente consiste à s’en servir comme d’un contexte, jamais comme d’un signal isolé. Une valeur basse dit que le marché a eu peur — pas qu’il va monter. Une valeur haute dit qu’il s’est enthousiasmé — pas qu’il va corriger.',
    ],
  },
  {
    question: 'Comment est-il calculé ?',
    answer: [
      'À partir de cinq familles de mesures, détaillées ci-contre : la volatilité, l’élan et le volume des échanges, le sentiment sur les réseaux sociaux, la dominance du bitcoin, et les tendances de recherche.',
      'Chaque module reçoit un poids dans la composition finale. Ces poids sont documentés par Alternative.me, mais la contribution de chaque module au relevé d’un jour donné n’est pas publiée : seule la valeur composite sort de son interface. C’est pourquoi aucun pourcentage n’est affiché sur cette page — il donnerait à croire à une décomposition que la source ne permet pas de montrer.',
    ],
  },
]

/** Les cinq modules de calcul — colonne de droite. */
const MODULES: Entry[] = [
  {
    question: 'Volatilité',
    answer: [
      'La volatilité récente du bitcoin et l’ampleur de ses reculs, comparées à leurs moyennes sur trente et quatre-vingt-dix jours.',
      'Une agitation inhabituelle est lue comme un marché nerveux : elle tire l’indice vers la peur.',
    ],
  },
  {
    question: 'Élan du marché et volume',
    answer: [
      'Les volumes échangés et l’élan des cours, rapportés eux aussi à leurs moyennes sur trente et quatre-vingt-dix jours.',
      'Des volumes d’achat élevés dans un marché qui monte sont lus comme de l’avidité — un marché qui achète d’autant plus qu’il monte déjà.',
    ],
  },
  {
    question: 'Sentiment des réseaux sociaux',
    answer: [
      'Le volume et la vitesse des publications liées aux crypto-actifs, notamment le nombre d’interactions par unité de temps.',
      'Une flambée d’interactions signale un intérêt du public inhabituel, interprété comme un marché avide.',
    ],
  },
  {
    question: 'Dominance du bitcoin',
    answer: [
      'La part du bitcoin dans la capitalisation totale du marché.',
      'Une dominance qui monte traduit souvent un repli vers la valeur refuge du secteur, au détriment des actifs plus spéculatifs : c’est un signe de peur. Une dominance qui baisse indique à l’inverse un appétit pour le risque, donc de l’avidité.',
    ],
  },
  {
    question: 'Tendances de recherche',
    answer: [
      'Le volume des recherches Google liées au bitcoin, et la nature des requêtes qui montent.',
      'Le libellé compte autant que le volume : une poussée sur « bitcoin price manipulation » ne décrit pas le même marché qu’une poussée sur « acheter du bitcoin ».',
    ],
  },
]

export function SentimentFaq() {
  return (
    <section aria-labelledby="faq-sentiment" className="space-y-4">
      <h2 id="faq-sentiment" className="display-sm text-ink">
        Questions fréquentes
      </h2>

      {/* Deux colonnes comme la référence : les questions générales à gauche, les
          modules de calcul à droite. Elles s'empilent sous `lg` — deux colonnes de
          questions dépliables sur un téléphone produisent des lignes de trois mots. */}
      <div className="grid gap-x-8 gap-y-2 lg:grid-cols-2 lg:items-start">
        <FaqColumn entries={GENERAL} openFirst />
        <FaqColumn entries={MODULES} />
      </div>
    </section>
  )
}

function FaqColumn({ entries, openFirst = false }: { entries: Entry[]; openFirst?: boolean }) {
  return (
    /* Chaque question dans sa CARTE, comme sur la référence. Une pile de lignes
       séparées par des filets se lit comme un sommaire ; des cartes disent que chaque
       entrée s'ouvre pour elle-même. La carte ouverte prend un fond légèrement plus
       marqué, ce qui rend l'état visible sans avoir à repérer le chevron. */
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <details
          key={entry.question}
          className="group rounded-card border border-border-subtle bg-surface px-4 open:bg-surface-muted"
          open={openFirst && index === 0}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {entry.question}
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <div className="space-y-2 pb-4">
            {entry.answer.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
                {paragraph}
              </p>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
