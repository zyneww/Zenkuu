'use client'

import { Tooltip as HeroTooltip } from '@heroui/react'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * INFOBULLE — HEROUI, EXPOSÉ TEL QUEL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── UNE PREMIÈRE TENTATIVE A ÉCHOUÉ, ET C'EST INSTRUCTIF ────────────────────
 *
 * On a d'abord voulu garder l'API de Radix en enveloppant CHAQUE partie —
 * `TooltipTrigger` autour de `Tooltip.Trigger`, `TooltipContent` autour de
 * `Tooltip.Content` — pour ne toucher aucun appelant. Le déclencheur recevait bien sa
 * classe `tooltip__trigger`, et la bulle ne s'ouvrait JAMAIS : ni au survol, ni au
 * focus. `Tooltip` reconnaît ses propres enfants par leur type ; un composant maison
 * interposé n'est plus ce type, et le contenu n'est jamais enregistré.
 *
 * La leçon vaut pour toutes les primitives composées : soit on compose leurs parties
 * NOUS-MÊMES sans les exposer (c'est ce que font `Slider`, `ProgressBar`, `Switch`),
 * soit on expose le composé TEL QUEL et l'on adapte les appelants. Il n'y a pas de
 * troisième voie, et l'enveloppe intermédiaire est un piège silencieux.
 *
 * ── D'OÙ CE FICHIER, QUI NE FAIT PRESQUE RIEN ───────────────────────────────
 *
 * Il réexporte le composé de HeroUI. Les appelants écrivent donc
 * `<Tooltip><Tooltip.Trigger/><Tooltip.Content/></Tooltip>` — cinq fichiers ont été
 * adaptés dans le même mouvement.
 *
 * ── CE QUE LA BASCULE APPORTE ───────────────────────────────────────────────
 *
 *   · PLUS DE `TooltipProvider`. Radix l'EXIGEAIT au-dessus de toute infobulle : sans
 *     lui, rien ne s'affiche et aucune erreur ne le dit. `InfoTip` portait
 *     l'avertissement en toutes lettres, preuve que le piège avait mordu. Chaque
 *     infobulle HeroUI est autonome.
 *   · PLUS DE `asChild`. `Tooltip.Trigger` accroche directement son enfant ; il n'y a
 *     plus de risque de bouton imbriqué dans un bouton, que `IconButton` devait
 *     désamorcer à la main.
 *   · `delay` et `closeDelay` par infobulle, là où Radix les tenait sur le fournisseur,
 *     donc pour toute la page.
 *
 * ── LE VOCABULAIRE A CHANGÉ ─────────────────────────────────────────────────
 *
 *   side="top"          →  placement="top"
 *   align="start"       →  placement="top start"
 *   sideOffset={8}      →  offset={8}
 *   delayDuration={120} →  delay={120}
 */
export const Tooltip = HeroTooltip
