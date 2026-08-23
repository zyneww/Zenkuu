'use client'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useSettings } from '@/lib/stores/settings'

/**
 * Les notifications passagères du site — une seule pile, posée dans la mise en page.
 *
 * ── DEUX ÉCARTS ASSUMÉS AVEC LE FICHIER DU REGISTRE SHADCN/UI ────────────────
 *
 * 1. LE THÈME NE VIENT PAS DE `next-themes`. Le fichier d'origine appelle
 *    `useTheme()` de cette bibliothèque, que Zenkuu n'utilise pas : le thème vit dans
 *    `lib/stores/settings.ts`, et c'est un script inline qui pose la classe `dark`
 *    AVANT la première peinture pour éviter le flash de thème clair. Brancher
 *    `next-themes` en plus donnerait deux sources de vérité pour un seul réglage, et
 *    la seconde arriverait après l'hydratation — donc trop tard pour ce qu'elle
 *    prétend corriger. On lit donc le store du projet.
 *
 * 2. LES VARIABLES SONT PRÉFIXÉES `--color-`. Le fichier d'origine écrit
 *    `var(--popover)` : c'est la convention des projets où shadcn/ui déclare
 *    lui-même ses jetons dans un bloc `:root`. Ici les rôles sont définis par le
 *    pont du haut de `globals.css`, à l'intérieur d'un `@theme` — Tailwind 4 les
 *    émet donc sous leur nom d'échelle, `--color-popover`. Sans le préfixe, les
 *    valeurs sont vides et la notification sort transparente.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSettings((state) => state.theme)

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--color-popover)',
          '--normal-text': 'var(--color-popover-foreground)',
          '--normal-border': 'var(--color-border)',
          '--border-radius': 'var(--radius-card)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
