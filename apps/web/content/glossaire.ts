/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GLOSSAIRE — LE VOCABULAIRE QU'IL FAUT AVOIR POUR LIRE LE SITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI IL EST ÉCRIT À LA MAIN ─────────────────────────────────────────
 *
 * Il aurait pu être dérivé des fiches d'apprentissage — elles définissent déjà des
 * notions dans leurs sections. Extraire automatiquement des définitions d'un texte
 * suivi produit des phrases coupées de leur contexte, et un glossaire dont la moitié
 * des entrées commencent au milieu d'une explication n'aide personne.
 *
 * ⚠️ CE N'EST PAS DE LA DONNÉE DE MARCHÉ. Le §5 interdit d'inventer un chiffre qu'aucune
 * source ne publie ; il n'interdit pas d'écrire ce qu'un mot veut dire. Ces définitions
 * sont du contenu rédactionnel, au même titre que les fiches — et comme elles, elles
 * disent ce qu'une notion mesure ET ce qu'elle ne mesure pas, plutôt que d'en donner la
 * version brochure.
 *
 * ── CE QU'ON N'Y TROUVERA PAS ───────────────────────────────────────────────
 *
 * Aucune entrée ne décrit une stratégie, un produit à effet de levier vu du côté du
 * gain, ni un terme dont la seule définition honnête serait « façon de perdre de
 * l'argent plus vite ». Quand une notion porte un risque, il est dans la définition,
 * pas en note de bas de page.
 *
 * ── L'INITIALE EST CALCULÉE, PAS SAISIE ─────────────────────────────────────
 *
 * Elle sert à ranger les entrées par lettre. La déduire du terme évite qu'une entrée
 * ajoutée à la va-vite se retrouve sous la mauvaise lettre — et les accents sont
 * retirés pour que « Écart » tombe sous E et non dans une vingt-septième lettre.
 */

export interface GlossaryEntry {
  term: string
  definition: string
  /** Fiche d'apprentissage qui développe la notion, quand il en existe une. */
  lesson?: string
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Actif du monde réel',
    definition:
      'Un actif hors chaîne — une action, un bon du Trésor, un immeuble — représenté par un jeton sur une blockchain. Le jeton suit la valeur du sous-jacent ; il ne le remplace pas, et sa garantie dépend entièrement de l’émetteur.',
  },
  {
    term: 'Altcoin',
    definition:
      'Toute cryptomonnaie autre que le bitcoin. Le mot ne dit rien de la qualité d’un projet : il regroupe des réseaux établis depuis dix ans et des jetons créés la semaine dernière.',
  },
  {
    term: 'Blockchain',
    definition:
      'Un registre de transactions répliqué sur de nombreuses machines, où chaque bloc renvoie au précédent. Sa propriété utile n’est pas d’être « infalsifiable » mais d’être vérifiable par n’importe qui, sans faire confiance à un tiers.',
  },
  {
    term: 'Bougie',
    definition:
      'La représentation d’une période sur un graphique : ouverture, plus haut, plus bas, clôture. Une bougie verte dit que la clôture dépasse l’ouverture — pas que la période a été calme.',
    lesson: 'lire-des-chandeliers',
  },
  {
    term: 'Capitalisation',
    definition:
      'Le cours multiplié par l’offre en circulation. Ce n’est pas de l’argent investi ni une somme qu’on pourrait retirer : vendre une fraction de l’offre ferait bouger le cours qui sert au calcul.',
    lesson: 'capitalisation',
  },
  {
    term: 'Capitalisation diluée',
    definition:
      'La même multiplication, mais avec l’offre maximale au lieu de l’offre en circulation. Elle répond à « combien vaudrait ce projet si tous les jetons prévus existaient déjà », question hypothétique par construction.',
    lesson: 'offre-en-circulation',
  },
  {
    term: 'Carnet d’ordres',
    definition:
      'La liste des offres d’achat et de vente en attente sur une place. Sa profondeur dit combien on peut échanger sans déplacer le cours — une information que le volume seul ne donne pas.',
    lesson: 'volume-et-liquidite',
  },
  {
    term: 'DeFi',
    definition:
      'Finance décentralisée : des services financiers rendus par des programmes sur une blockchain plutôt que par une institution. L’absence d’intermédiaire retire un risque de contrepartie et en ajoute un autre — celui du code lui-même.',
  },
  {
    term: 'Dominance',
    definition:
      'La part d’un actif dans la capitalisation totale du marché. Elle monte aussi bien quand cet actif progresse que quand le reste recule : une dominance en hausse ne signifie pas un cours en hausse.',
    lesson: 'dominance',
  },
  {
    term: 'Écart acheteur-vendeur',
    definition:
      'La différence entre le meilleur prix d’achat et le meilleur prix de vente à un instant donné. C’est un coût réel de transaction, invisible sur un graphique de cours.',
  },
  {
    term: 'Effet de levier',
    definition:
      'Emprunter pour prendre une position plus grande que son capital. Il multiplie les variations dans les deux sens : une baisse modeste du marché suffit à effacer l’intégralité de la mise.',
  },
  {
    term: 'ETF',
    definition:
      'Un fonds coté en bourse qui réplique un indice ou un actif. Il s’achète comme une action et permet une exposition sans détenir directement le sous-jacent.',
  },
  {
    term: 'Frais de financement',
    definition:
      'Sur un contrat perpétuel, le paiement périodique entre acheteurs et vendeurs qui maintient le prix du contrat près du prix au comptant. Un financement durablement positif signale un déséquilibre des positions, pas une prévision.',
  },
  {
    term: 'Halving',
    definition:
      'La division par deux de la récompense versée aux mineurs du bitcoin, programmée tous les 210 000 blocs. Elle ralentit la création de nouvelles unités ; elle ne fixe aucun cours.',
  },
  {
    term: 'Indice de peur et d’avidité',
    definition:
      'Une composition d’indicateurs — volatilité, volume, réseaux sociaux, dominance, recherches — résumée en un nombre de 0 à 100. Il décrit un état d’esprit observé, jamais une prévision.',
  },
  {
    term: 'Intérêt ouvert',
    definition:
      'Le nombre de contrats dérivés en cours et non encore soldés. Il mesure l’exposition accumulée sur un marché, là où le volume mesure l’activité d’une journée.',
  },
  {
    term: 'Jeton',
    definition:
      'Une unité émise sur une blockchain existante, par opposition à la monnaie native du réseau. Un jeton dépend donc de deux choses : son propre projet, et la chaîne qui l’héberge.',
  },
  {
    term: 'Liquidité',
    definition:
      'La capacité à échanger un montant sans déplacer le cours. Elle se lit dans la profondeur du carnet d’ordres, et non dans le volume — deux notions souvent confondues.',
    lesson: 'volume-et-liquidite',
  },
  {
    term: 'Moyenne mobile',
    definition:
      'La moyenne des derniers cours, recalculée à chaque période. Elle lisse le bruit au prix d’un retard : ce retard est sa définition, pas son défaut.',
    lesson: 'moyennes-mobiles',
  },
  {
    term: 'NFT',
    definition:
      'Un jeton non fongible : chaque unité est distincte des autres, contrairement à une monnaie. Ce qu’il certifie est une inscription sur une chaîne, pas nécessairement un droit sur ce qu’il représente.',
  },
  {
    term: 'Offre en circulation',
    definition:
      'Le nombre d’unités effectivement disponibles sur le marché, hors jetons verrouillés ou non émis. C’est elle qui entre dans le calcul de la capitalisation.',
    lesson: 'offre-en-circulation',
  },
  {
    term: 'Offre maximale',
    definition:
      'Le plafond d’unités qui existeront jamais, quand le protocole en fixe un. Beaucoup de projets n’en ont aucun, ce qui n’est ni un défaut ni une garantie.',
    lesson: 'offre-en-circulation',
  },
  {
    term: 'Perpétuel',
    definition:
      'Un contrat dérivé sans date d’échéance, maintenu près du prix au comptant par les frais de financement. On n’y détient rien : on y porte une exposition.',
  },
  {
    term: 'Place de cotation',
    definition:
      'Un lieu où les actifs changent de mains. Les volumes annoncés varient fortement en fiabilité d’une place à l’autre, d’où les notes de confiance publiées par les agrégateurs.',
  },
  {
    term: 'Portefeuille',
    definition:
      'Le logiciel ou le matériel qui garde les clés donnant accès à des actifs sur une chaîne. Il ne « contient » rien : ce sont les clés qu’il protège, et leur perte est définitive.',
  },
  {
    term: 'Rachat',
    definition:
      'Le retrait de jetons de la circulation par le protocole qui les a émis, souvent financé par ses revenus. L’effet sur l’offre est mesurable ; l’effet sur le cours ne l’est pas.',
  },
  {
    term: 'Stablecoin',
    definition:
      'Un jeton dont la valeur suit celle d’une monnaie, le plus souvent le dollar. Sa stabilité dépend entièrement de ce qui garantit l’ancrage — des réserves, un mécanisme, ou rien de vérifiable.',
  },
  {
    term: 'Trésorerie d’entreprise',
    definition:
      'Les cryptoactifs qu’une société cotée déclare détenir à son bilan. Le registre est DÉCLARATIF : il reflète ce que les entreprises publient, à la fréquence où elles le publient.',
  },
  {
    term: 'TVL',
    definition:
      'Total value locked : la valeur des capitaux déposés dans des protocoles décentralisés. Ce n’est pas une capitalisation — elle compte de l’argent immobilisé, pas la valeur de jetons émis.',
  },
  {
    term: 'Volatilité',
    definition:
      'L’ampleur des variations d’un cours sur une période. Elle n’a pas de sens de hausse ou de baisse : un marché très volatil bouge beaucoup, dans les deux directions.',
  },
  {
    term: 'Volume',
    definition:
      'Le montant échangé sur une période, toutes places confondues. Il mesure l’activité, pas la facilité à échanger — c’est la liquidité qui répond à cette seconde question.',
    lesson: 'volume-et-liquidite',
  },
  {
    term: 'Wrapped',
    definition:
      'Un jeton adossé à un actif d’une autre chaîne, émis pour le rendre utilisable là où il n’existe pas nativement. La garantie repose sur le dépositaire qui détient l’actif d’origine.',
  },
]

/**
 * L'initiale de rangement, accents retirés.
 *
 * Sans normalisation, « Écart » tomberait sous « É » — une lettre que l'index
 * alphabétique ne propose pas, et l'entrée disparaîtrait de la liste.
 */
export function glossaryInitial(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .charAt(0)
    .toUpperCase()
}

/** Les entrées groupées par initiale, dans l'ordre alphabétique français. */
export function glossaryByLetter(): { letter: string; entries: GlossaryEntry[] }[] {
  const map = new Map<string, GlossaryEntry[]>()

  for (const entry of GLOSSARY) {
    const letter = glossaryInitial(entry.term)
    const bucket = map.get(letter)
    if (bucket) bucket.push(entry)
    else map.set(letter, [entry])
  }

  return [...map.entries()]
    .map(([letter, entries]) => ({
      letter,
      entries: entries.sort((a, b) => a.term.localeCompare(b.term, 'fr')),
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter, 'fr'))
}
