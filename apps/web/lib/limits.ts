/**
 * PLAFONDS DU SITE — les mêmes pour tout le monde.
 *
 * ── CE FICHIER REMPLACE `lib/billing.ts` ──────────────────────────────────────
 *
 * Il y avait deux jeux de plafonds, un « gratuit » et un « Zenkuu Pro », et une
 * machinerie pour décider lequel s'appliquait : un fournisseur d'authentification,
 * une facturation adossée à lui, un composant de garde côté navigateur, un second
 * côté serveur, une page de tarifs, une rubrique d'abonnement dans les réglages.
 *
 * L'abonnement a été retiré du site avec le fournisseur de comptes qui le portait.
 * Il ne reste donc qu'un jeu de valeurs, et ce fichier est ce qui subsiste de trois
 * cents lignes : les plafonds retenus sont ceux de l'ancienne offre payante, puisque
 * plus rien ne justifie de brider quiconque.
 *
 * ── POURQUOI DES PLAFONDS SUBSISTENT MALGRÉ TOUT ──────────────────────────────
 *
 * Ils ne protègent plus un modèle économique, ils protègent la base et les
 * fournisseurs de données. Une liste de suivi sans limite est une invitation à
 * enregistrer les dix mille actifs du catalogue, et la page qui l'affiche
 * demanderait alors dix mille cotations à des sources plafonnées à quelques
 * requêtes par minute (§5).
 */

/**
 * Actifs par visiteur, toutes listes confondues.
 *
 * 200 et non 30 : trente était le plafond de l'offre gratuite, calibré pour qu'un
 * usage sérieux finisse par le heurter. Cette intention n'a plus lieu d'être.
 */
export const WATCHLIST_ASSET_LIMIT = 200

/**
 * Listes distinctes par visiteur.
 *
 * L'ORGANISATION était le cœur de ce qui se vendait : l'offre gratuite n'avait droit
 * qu'à une seule liste. Dix est large sans être infini — au-delà, le sélecteur de
 * liste devient un annuaire, ce qui est un problème d'interface avant d'être un
 * problème de quota.
 */
export const WATCHLIST_COUNT_LIMIT = 10

/*
 * ⚠️ `ALERT_LIMIT` A ÉTÉ SUPPRIMÉ AVEC LES ALERTES DE PRIX.
 *
 * Il plafonnait à cent les alertes armées simultanément, pour protéger la tâche
 * planifiée qui relisait les seuils. Ni la tâche ni les alertes n'existent plus.
 */

/** Actifs comparables d'un seul coup dans le comparateur. */
export const COMPARE_LIMIT = 6
