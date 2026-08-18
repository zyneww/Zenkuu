/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TABLE DE PHRASES — le texte français EST la clé
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE PROBLÈME QU'ELLE RÉSOUT ───────────────────────────────────────────────
 *
 * Le dictionnaire `content/fr.ts` couvre les libellés d'interface partagés : la
 * navigation, les tableaux, les messages d'erreur. Il ne couvre pas — et ne peut pas
 * raisonnablement couvrir — les centaines de phrases écrites DANS les pages : titres,
 * chapeaux, notes de méthode, légendes de figures.
 *
 * Les y verser demanderait d'inventer une clé par phrase (`macro.lead`,
 * `heatmap.readingNote2`…), de la déclarer dans le type, puis de remplacer chaque
 * littéral par un accès indexé. Sur six cents phrases, c'est six cents clés à nommer,
 * et une clé mal nommée est un texte introuvable.
 *
 * ── CE QUE FAIT CETTE TABLE ──────────────────────────────────────────────────
 *
 * Elle prend le texte FRANÇAIS pour identifiant, comme le fait `gettext` depuis
 * trente ans. Traduire une page revient alors à envelopper ses littéraux :
 *
 *     <h1>Carte thermique du marché</h1>
 *     <h1>{t('Carte thermique du marché')}</h1>
 *
 * Trois propriétés en découlent, et ce sont elles qui justifient le procédé :
 *
 *   · AUCUNE CLÉ À INVENTER. Le texte se lit sur place, dans le composant, comme
 *     avant. Un relecteur voit ce que la page affiche sans ouvrir un second fichier.
 *
 *   · LE REPLI EST LE FRANÇAIS, et il est automatique. Une phrase absente de la table
 *     rend son propre identifiant, c'est-à-dire le français — jamais une clé nue du
 *     genre `macro.lead` affichée à l'écran, qui est le mode d'échec des systèmes à
 *     clés inventées.
 *
 *   · AJOUTER DU TEXTE NE CASSE RIEN. Une phrase neuve s'affiche en français dans les
 *     douze autres langues jusqu'à ce qu'elle soit traduite, ce qui est exactement la
 *     politique de repli déjà en vigueur pour le dictionnaire.
 *
 * ── CE QUE ÇA COÛTE, ET POURQUOI C'EST ACCEPTABLE ────────────────────────────
 *
 * Deux limites réelles :
 *
 *   · CORRIGER UNE COQUILLE FRANÇAISE ORPHELINE SA TRADUCTION. Changer « Carte
 *     thermique » en « Carte de chaleur » fait retomber les douze langues sur le
 *     français jusqu'à ce que la table suive. C'est visible, réparable, et sans perte
 *     de donnée — au contraire d'une clé renommée, qui casse la compilation.
 *
 *   · DEUX PHRASES IDENTIQUES DANS DEUX CONTEXTES PARTAGENT LEUR TRADUCTION. Le cas
 *     se pose sur les mots isolés — « Volume », « Prix » — et il est sans danger ici :
 *     ce sont des termes de marché, dont la traduction ne dépend pas de la colonne où
 *     ils se trouvent. Une phrase qui devrait diverger doit passer par le dictionnaire
 *     structuré, où le contexte est porté par la clé.
 *
 * ── LA TABLE NE REMPLACE PAS `content/fr.ts` ─────────────────────────────────
 *
 * Les deux cohabitent, et le partage est net : le DICTIONNAIRE porte ce qui est
 * paramétré ou réutilisé — un libellé consulté depuis quarante fichiers, une phrase à
 * trous du genre `convertedNotice(from, to, date)` — la TABLE porte ce qui est écrit
 * une fois, à un endroit. Verser les premières ici perdrait leur interpolation ;
 * verser les secondes là-bas coûterait six cents clés.
 */

export type Phrases = Record<string, string>

/**
 * Traduit une phrase, ou la rend telle quelle.
 *
 * Le repli est le TEXTE D'ENTRÉE et non une chaîne vide : une phrase non traduite
 * s'affiche en français, ce qui est lisible, plutôt que de laisser un trou dans la
 * page — comportement le plus important de cette fonction, et la raison pour laquelle
 * elle ne peut pas rendre `undefined`.
 *
 * ── LA TABLE EST ACCEPTÉE PARTIELLE, ET C'EST INDISPENSABLE ──────────────────
 *
 * Le paramètre est typé `Partial` plutôt que `Phrases` parce que c'est la forme dans
 * laquelle la table ARRIVE : un fichier de traduction est un `DeepPartial<Content>`,
 * et sa branche `phrases` a donc des valeurs possiblement absentes. Exiger la forme
 * complète obligerait chaque appelant à mentir au compilateur par une assertion — sur
 * la seule structure du site dont l'incomplétude est le fonctionnement normal.
 */
export function translate(
  phrases: Partial<Phrases> | undefined,
  text: string,
): string {
  return phrases?.[text] ?? text
}
