import { NextResponse } from 'next/server'

import { getSentimentHistory } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'INDICE DE PEUR ET D'AVIDITÉ, SERVI À LA DEMANDE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Il alimente une seule chose : la case « Indice de peur et d'avidité » du menu de
 * réglages du graphique, qui superpose cette courbe à celle du cours.
 *
 * ── POURQUOI UNE ROUTE PLUTÔT QU'UN CHARGEMENT AVEC LA FICHE ────────────────
 *
 * Deux raisons, et la seconde est la vraie.
 *
 * La première tient à Next.js, et c'est celle qu'invoque déjà `/api/tendances` :
 * le framework retient le PLUS COURT des `revalidate` de tous les appels d'un rendu.
 * Cet indice a un TTL de 30 minutes, la fiche d'actif de 3 : le charger dans le rendu
 * ne changerait rien à la fiche, mais l'inverse serait vrai le jour où un appel plus
 * court arriverait.
 *
 * La seconde : QUATRE LECTEURS SUR CINQ N'OUVRIRONT JAMAIS CE MENU. Charger la série
 * avec chaque fiche ferait payer un aller-retour — et une part du quota de vingt
 * requêtes par fenêtre du fournisseur — pour une courbe que presque personne
 * n'affiche. Elle part donc à la PREMIÈRE activation de la case, et une seule fois
 * par session.
 *
 * ── LA PROFONDEUR EST BORNÉE, ET LA BORNE EST DANS LA CLÉ DE CACHE ──────────
 *
 * `getSentimentHistory(days)` compose sa clé avec `days` : un paramètre libre
 * ouvrirait autant d'entrées de cache que d'entiers. La liste blanche reprend les
 * paliers que la barre d'outils du graphique sait demander, et rien d'autre.
 *
 * ⚠️ 730 EST LE PLAFOND DU FOURNISSEUR, pas un choix de confort : `fetchSentiment
 * History` borne lui-même sa limite à cette valeur. Demander « MAX » sur un actif qui
 * a dix ans d'historique ne rendra donc que deux ans d'indice — c'est une donnée qui
 * ne remonte pas plus haut, et la courbe s'arrêtera simplement là où la source
 * s'arrête plutôt que d'être prolongée par une invention.
 */
const PROFONDEURS = new Set([1, 7, 30, 90, 180, 365, 730])

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const demande = Number.parseInt(params.get('jours') ?? '', 10)

  /* Hors liste — ou absent — on retombe sur l'année, qui est la fenêtre la plus
     courante et la seule que toutes les périodes du graphique savent couvrir. */
  const jours = PROFONDEURS.has(demande) ? demande : 365

  const history = await getSentimentHistory(jours)

  /*
   * ⚠️ UNE PANNE N'EST PAS UNE SÉRIE VIDE, et l'appelant doit pouvoir les distinguer.
   * Une série vide se lit « la source n'a rien pour cette fenêtre » ; `indisponible`
   * dit « la source n'a pas répondu ». Le premier cas laisse la case cochée sans
   * courbe, le second doit pouvoir la rendre inopérante plutôt que muette.
   */
  return NextResponse.json(
    {
      points: history.ok ? history.data : [],
      indisponible: !history.ok,
    },
    /* Deux minutes côté navigateur : la série est quotidienne, et le cache applicatif
       la tient déjà trente minutes. Ce qu'on évite ici est le second appel du même
       lecteur qui coche puis décoche puis recoche. */
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
