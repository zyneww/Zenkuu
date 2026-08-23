'use client'

import { useState } from 'react'

import { FieldSeparator } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoginForm } from '@/components/account/LoginForm'
import { SocialButtons } from '@/components/account/SocialButtons'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Les deux intentions que le visiteur exprime en arrivant.
 *
 * Elles ne changent RIEN au mécanisme — la même adresse suit le même chemin, et le
 * code reçu vaut vérification qu'un compte existe ou non. Ce qu'elles changent est ce
 * que le visiteur LIT : quelqu'un qui vient créer un compte et voit « Se connecter »
 * se demande s'il est au bon endroit, et quelqu'un qui revient et voit « Inscription »
 * craint d'en créer un second.
 *
 * C'est exactement le parti de CoinGecko, dont la fenêtre bascule entre les deux par
 * un lien de bas de page sans jamais changer de formulaire.
 */
export type AuthMode = 'signin' | 'signup'

const COPY: Record<AuthMode, { title: string; lead: string; switchLead: string; switchCta: string }> =
  {
    signin: {
      title: 'Connexion',
      lead: 'Retrouvez votre liste de suivi et vos alertes sur tous vos appareils.',
      switchLead: 'Pas encore de compte ?',
      switchCta: 'Inscrivez-vous',
    },
    signup: {
      title: 'Inscription',
      lead: 'Un compte gratuit pour emporter votre liste de suivi d’un appareil à l’autre.',
      switchLead: 'Vous avez déjà un compte ?',
      switchCta: 'Connectez-vous',
    },
  }

/**
 * FENÊTRE D'AUTHENTIFICATION — deux intentions, un seul mécanisme.
 *
 * ── CE QU'ELLE REMPLACE ──────────────────────────────────────────────────────
 *
 * Le menu de compte ouvrait directement un champ d'adresse électronique, sous le
 * titre « Se connecter ». Le raccourci était défendable — il n'existe qu'un chemin —
 * mais il posait au visiteur une question qu'il n'avait pas envisagée : personne
 * n'arrive sur un site en pensant « je veux saisir une adresse », on arrive en pensant
 * « je veux mon compte » ou « je veux en créer un ».
 *
 * Le menu porte donc désormais DEUX BOUTONS, et le formulaire vit ici, dans une
 * fenêtre qui annonce d'abord ce qu'on est en train de faire.
 *
 * ── POURQUOI UNE MODALE ALORS QU'UN PANNEAU SUFFISAIT ────────────────────────
 *
 * Le panneau déroulant faisait 288 pixels de large — la largeur d'un menu, pas d'un
 * formulaire. Y loger en plus trois boutons de fournisseurs et un séparateur aurait
 * donné une colonne de contrôles serrés sous la barre de navigation. La fenêtre offre
 * la largeur qu'il faut, et surtout elle ne se referme pas quand la souris s'éloigne —
 * ce que fait le panneau, et qui est acceptable pour un menu, pas pendant qu'on
 * s'authentifie.
 *
 * ── LE MODE EST UN ÉTAT INTERNE, PAS UNE PROPRIÉTÉ FIGÉE ─────────────────────
 *
 * L'appelant dit par quelle intention ouvrir ; la fenêtre laisse ensuite basculer.
 * Refermer et rouvrir pour changer d'avis ferait perdre l'adresse déjà saisie.
 */
export function AuthOverlay({
  open,
  mode: initialMode,
  onClose,
  socialProviders,
}: {
  open: boolean
  mode: AuthMode
  onClose: () => void
  /** Fournisseurs réellement configurés — voir `SocialButtons`. */
  socialProviders: readonly string[]
}) {
  const t = usePhrase()
  /*
   * ── SYNCHRONISATION PAR DÉRIVATION, ET NON PAR EFFET ───────────────────────
   *
   * L'intention de l'appelant doit l'emporter à CHAQUE ouverture : cliquer
   * « Inscription » après avoir basculé sur « Connexion » lors d'une visite
   * précédente doit bien rouvrir sur l'inscription.
   *
   * La façon naturelle de l'écrire — un `useEffect` qui repose `setMode(initialMode)`
   * quand `open` passe à vrai — est refusée par le linter, et à raison : elle rend un
   * premier écran avec l'ancien mode, puis en rend un second. Sur une fenêtre qui
   * apparaît, ce premier rendu est VISIBLE — le titre affiche brièvement
   * « Connexion » avant de devenir « Inscription ».
   *
   * Le motif recommandé par React est celui-ci : mémoriser la dernière valeur reçue
   * pendant le rendu et corriger l'état sur place. React reprend alors immédiatement
   * le rendu avec la bonne valeur, sans jamais peindre l'état intermédiaire.
   */
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [lastRequested, setLastRequested] = useState<AuthMode | null>(open ? initialMode : null)

  if (open && lastRequested !== initialMode) {
    setLastRequested(initialMode)
    setMode(initialMode)
  } else if (!open && lastRequested !== null) {
    // Remis à zéro à la fermeture : sans cela, rouvrir sur la MÊME intention que la
    // dernière fois ne réinitialiserait pas le mode, et la fenêtre s'ouvrirait sur
    // celui vers lequel le visiteur avait basculé.
    setLastRequested(null)
  }

  const copy = COPY[mode]

  return (
    /*
      ── LA COQUE EST UN `Dialog` DE SHADCN/UI, ET CE N'EST PAS QU'UN RANGEMENT ──

      Ce fichier écrivait à la main le voile, le cadre, la croix, l'écoute d'Échap, le
      blocage du défilement du fond, et un `<button>` plein écran qui servait de zone
      de clic extérieure. Radix fait tout cela — et trois choses de plus, qui
      manquaient et qu'on ne remarque qu'à l'usage :

        · LE PIÈGE À FOCUS. La tabulation sortait de la fenêtre et parcourait la page
          dessous, invisible, jusqu'à revenir. Ici elle reste dedans, et le focus
          retourne au déclencheur à la fermeture.
        · `aria-hidden` SUR LE RESTE DU DOCUMENT. Un lecteur d'écran pouvait lire la
          page masquée par le voile comme si elle était encore là.
        · LE VOILE N'EST PLUS UN BOUTON. Un `<button aria-label="Fermer">` couvrant
          tout l'écran était annoncé comme une cible par la synthèse vocale ; Radix
          écoute le pointeur sans créer d'élément interactif.
    */
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[26rem] border-border-subtle bg-overlay p-6 shadow-overlay sm:max-w-[26rem]">
        <DialogHeader className="space-y-1.5 pr-8 text-left">
          <DialogTitle className="display-sm text-ink">{t(copy.title)}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-ink-muted">
            {t(copy.lead)}
          </DialogDescription>
        </DialogHeader>

        {/*
          LES FOURNISSEURS D'ABORD, L'ADRESSE ENSUITE — l'ordre de CoinGecko.

          Il suit la probabilité réelle : un compte social se relie en un clic, une
          adresse demande d'aller chercher un code dans sa boîte. Placer le chemin le
          plus long en tête ferait manquer le plus court à ceux qui balaient l'écran.
        */}
        <div className="mt-5">
          <SocialButtons mode={mode} configured={socialProviders} />
        </div>

        {/* Séparateur à filets. Il dit que les deux blocs mènent au MÊME endroit —
            sans lui, on lit deux formulaires empilés sans savoir lequel choisir.

            `FieldSeparator` plutôt que deux `<span className="h-px">` : il porte le
            mot AU MILIEU du trait, ce que le montage manuel obtenait par trois
            éléments et un `flex`, et il le marque `aria-hidden` de lui-même — un
            lecteur d'écran n'a rien à faire d'un « ou » décoratif entre deux
            groupes qu'il annonce déjà séparément. */}
        <FieldSeparator className="my-5">ou</FieldSeparator>

        {/* `key` sur le mode : basculer entre connexion et inscription REMONTE le
            formulaire, ce qui le ramène à son étape « adresse ». Sans cela, quelqu'un
            au milieu d'une saisie de code basculerait de mode tout en restant devant
            un champ à six chiffres, désormais sans rapport avec le titre affiché. */}
        <LoginForm key={mode} visible={open} density="overlay" hideHeading />

        <p className="mt-5 border-t border-border-subtle pt-4 text-center text-xs text-ink-muted">
          {copy.switchLead}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-medium text-brand transition-colors hover:text-brand-strong hover:underline"
          >
            {copy.switchCta}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  )
}
