/**
 * Numéros de page à afficher dans une barre de pagination — `null` marque une coupure.
 *
 * ── POURQUOI CE CALCUL VIT DANS SON PROPRE FICHIER ───────────────────────────
 *
 * Il était écrit dans `Pagination.tsx`, et ses tests ne pouvaient pas s'exécuter :
 * l'exécuteur de tests refuse d'analyser un module qui contient du JSX. Une logique
 * pure enfermée dans un composant est une logique qu'on ne peut pas éprouver, et
 * celle-ci en a besoin — c'est le genre de code qui paraît trivial et se trompe d'une
 * unité aux bornes.
 *
 * ── LA FENÊTRE EST GLISSANTE, ET BORNÉE ──────────────────────────────────────
 *
 * Trois cents lignes par vingt-cinq font douze pages ; trois mille en feraient cent
 * vingt, et une rangée de cent vingt boutons est un mur, pas une navigation. On montre
 * donc la première, la dernière et trois autour de la page courante ; le reste s'écrit
 * « … ».
 */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  /*
   * Sept ou moins : tout tient, aucune ellipse n'est utile.
   *
   * Le seuil vaut exactement le nombre d'emplacements de la forme longue —
   * `1 … n-1 n n+1 … dernier` — sans quoi on afficherait une ellipse pour masquer une
   * seule page.
   */
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const around = [page - 1, page, page + 1].filter((entry) => entry > 1 && entry < pageCount)
  const shown = new Set<number>([1, ...around, pageCount])

  const out: (number | null)[] = []
  let previous = 0

  for (const entry of [...shown].sort((a, b) => a - b)) {
    /*
     * Une coupure ne s'écrit que si elle masque au moins DEUX pages.
     *
     * Sauter de 3 à 5 pour cacher la seule page 4 remplacerait un chiffre cliquable
     * par un point de suspension inerte : on perd une cible sans rien économiser.
     */
    if (previous && entry - previous > 1) out.push(entry - previous === 2 ? previous + 1 : null)
    out.push(entry)
    previous = entry
  }

  return out
}
