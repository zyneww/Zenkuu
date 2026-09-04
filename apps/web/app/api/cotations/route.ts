import { NextResponse } from 'next/server'

import { getCryptoBoardPage, isSupportedCurrency } from '@zenkuu/data'

import { DEFAULT_ROWS, ROW_CHOICES } from '@/lib/limits'
import { guard } from '@/lib/rate-limit'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES PAGES DU TABLEAU D'ACCUEIL AU-DELÀ DE CE QUI A ÉTÉ SERVI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE ROUTE EXISTE ────────────────────────────────────────────
 *
 * L'accueil est une page STATIQUE, régénérée toutes les trois minutes et partagée par
 * tous les visiteurs. C'est ce qui la rend tenable sur un quota gratuit : un seul
 * appel amont sert tout le monde. La contrepartie est qu'elle ne peut lire aucun
 * paramètre du visiteur — un numéro de page dans l'URL la rendrait dynamique, donc
 * sans cache partagé, et referait un appel amont par visiteur et par page.
 *
 * Le tableau reçoit donc les 250 premières capitalisations avec la page, et vient
 * chercher ICI les suivantes quand le lecteur les demande. La source en publie plus
 * de dix-neuf mille : sans cette route, le tableau s'arrêterait à sa dixième page.
 *
 * ── CE QUE LE NAVIGATEUR NE FAIT PAS LUI-MÊME ──────────────────────────────
 *
 * Les trois raisons de `/api/recherche` valent telles quelles : la clé d'API ne part
 * jamais côté client, le cache serveur est partagé — une page 12 déjà demandée par
 * quelqu'un d'autre ne consomme aucun quota — et le limiteur de débit s'applique
 * globalement, ce qui serait impossible depuis les navigateurs.
 */

/*
 * Les crans du sélecteur viennent de `lib/limits.ts`, où le tableau les lit aussi.
 * Toute autre valeur est ramenée au cran par défaut — voir la validation plus bas.
 */

export async function GET(request: Request) {
  /* Même garde-fou que la recherche, et pour la même raison : chaque combinaison
     (page, lignes, devise) ouvre une entrée de cache et, à froid, un appel sortant.
     Une boucle qui ferait varier `page` viderait le quota pour tout le site. */
  const limited = guard(request, 'cotations', 40)
  if (limited) return limited

  const params = new URL(request.url).searchParams

  const page = Number.parseInt(params.get('page') ?? '1', 10)
  const perPage = Number.parseInt(params.get('lignes') ?? String(DEFAULT_ROWS), 10)
  const currency = (params.get('devise') ?? 'eur').toLowerCase()

  /*
    ── LES TROIS ENTRÉES SONT VALIDÉES, PAS SEULEMENT BORNÉES ────────────────

    C'est une frontière de confiance : ces valeurs viennent d'une URL publique et
    finissent dans une clé de cache et dans une requête sortante. Une page négative,
    un nombre de lignes arbitraire ou une devise inventée ouvriraient chacun une
    entrée de cache par valeur essayée — le cache lui-même devient alors le vecteur.

    `perPage` est contraint aux crans RÉELS du sélecteur plutôt qu'à un intervalle :
    un intervalle laisse 1 à 250, soit 250 clés par page au lieu de trois.
  */
  if (!Number.isFinite(page) || page < 1 || page > 10_000) {
    return NextResponse.json({ erreur: 'Page invalide' }, { status: 400 })
  }

  const rows = (ROW_CHOICES as readonly number[]).includes(perPage) ? perPage : DEFAULT_ROWS

  if (!isSupportedCurrency(currency)) {
    return NextResponse.json({ erreur: 'Devise inconnue' }, { status: 400 })
  }

  const result = await getCryptoBoardPage(page, rows, currency)

  if (!result.ok) {
    /* 200 avec un drapeau plutôt qu'un 5xx : côté tableau, « la source n'a pas
       répondu » se traite comme un état d'affichage, pas comme une panne du site.
       Le composant garde ses lignes précédentes et le dit. */
    return NextResponse.json(
      { actifs: [], indisponible: true, raison: result.reason },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { actifs: result.data, indisponible: false },
    // Le cache applicatif fait déjà le gros du travail ; cet en-tête évite qu'un
    // aller-retour vers la même page reparte du navigateur.
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
