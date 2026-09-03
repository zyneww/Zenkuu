-- ═══════════════════════════════════════════════════════════════════════════
-- LE MOT DE PASSE ENTRE DANS LA TABLE DES COMPTES
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Les trois colonnes sont AJOUTÉES et rien n'est retiré : un compte existant reste
-- valide, `password_hash` restant nul jusqu'à ce que son titulaire en pose un. La
-- connexion par code à usage unique continue de fonctionner sans changement.
--
-- ⚠️ UN `DROP TABLE price_alerts` FIGURAIT DANS LA VERSION ENGENDRÉE, ET IL A ÉTÉ
-- RETIRÉ À LA MAIN. Il ne venait pas de ce travail : la table avait été sortie du
-- schéma avec la fonctionnalité d'alertes, sans migration pour l'effacer, et l'outil
-- rattrapait l'écart à la première occasion.
--
-- Effacer des lignes d'utilisateurs comme effet de bord d'une migration de mots de
-- passe serait la mauvaise façon de le faire : cela se découvrirait après coup, dans
-- une migration dont le nom ne l'annonce pas. La note de `schema.ts` prévoit déjà que
-- cette table subsiste en base sans gêner personne — plus aucun code ne la lit. Sa
-- suppression mérite sa propre migration, décidée pour elle-même.
--> statement-breakpoint
ALTER TABLE `accounts` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `password_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `password_locked_until` integer;
