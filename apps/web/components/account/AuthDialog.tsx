'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

import { LoginForm } from '@/components/account/LoginForm'
import { SocialButtons } from '@/components/account/SocialButtons'
import type { AuthMode } from '@/components/account/auth-mode'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldSeparator } from '@/components/ui/field'
import { Link } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FENÊTRE D'AUTHENTIFICATION — LA FORME DE COINGECKO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE REMPLACE, ET POURQUOI ON REVIENT À UNE FENÊTRE ────────────────
 *
 * La connexion et l'inscription avaient été sorties en PAGES (`/connexion`,
 * `/inscription`). Ce que la page apportait — une adresse partageable, un retour
 * arrière — n'a pas été jugé décisif face à ce qu'elle coûtait : elle fait QUITTER la
 * page qu'on regardait. Sur un site de cotations, s'authentifier n'est presque jamais
 * le but de la visite ; c'est une parenthèse au milieu d'autre chose, et une
 * parenthèse se referme là où elle s'est ouverte.
 *
 * C'est le choix de la référence, et sa fenêtre est reprise poste pour poste.
 *
 * ── L'ORDRE DES BLOCS EST CELUI DE LA RÉFÉRENCE ─────────────────────────────
 *
 *   1. LES FOURNISSEURS D'ABORD, en boutons pleine largeur. Un compte social se relie
 *      en un clic ; l'adresse demande d'aller chercher un code dans sa boîte. Placer
 *      le chemin le plus long en tête ferait manquer le plus court.
 *   2. « ou », en séparateur à filets.
 *   3. « CONTINUER PAR E-MAIL » EST UN BOUTON, PAS UN CHAMP. C'est la différence la
 *      plus visible avec la version précédente, et elle est délibérée : un champ
 *      ouvert impose une saisie à qui venait cliquer sur Google. Le champ n'apparaît
 *      qu'après ce clic — un geste de plus pour la minorité qui le veut, zéro pour les
 *      autres.
 *   4. La mention légale ferme la fenêtre.
 *
 * ── UN SEUL TITRE POUR LES DEUX INTENTIONS ──────────────────────────────────
 *
 * « Bienvenue sur ZENKUU », que l'on vienne de « Se connecter » ou de « S'inscrire ».
 * La référence fait de même, et c'est exact ici : le mécanisme est le MÊME — un code
 * envoyé par courriel crée le compte s'il n'existe pas. Annoncer deux parcours pour un
 * seul obligerait à choisir avant de savoir, et à se tromper une fois sur deux.
 *
 * `mode` n'est donc plus qu'une nuance de sous-titre, et sert aux fournisseurs, qui
 * l'inscrivent dans l'état OAuth pour la page de retour.
 */
export function AuthDialog({
  open,
  mode,
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
   * Le champ d'adresse est-il déplié ?
   *
   * L'état est REMIS À ZÉRO à la fermeture par la `key` posée sur le contenu (voir
   * plus bas) : rouvrir la fenêtre doit remontrer les fournisseurs, pas le champ que
   * la visite précédente avait ouvert.
   */
  const [showEmail, setShowEmail] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        key={open ? 'ouverte' : 'fermée'}
        /* HAUT DE L'ÉCRAN, PAS CENTRÉE — comme la référence. Le centrage vertical
           par défaut de la fenêtre la fait descendre à mesure qu'elle grandit : le
           titre part vers le milieu de l'écran quand le champ d'adresse se déplie, et
           le regard doit le suivre. Ancrée en haut (`top-[8vh]`, translation verticale
           annulée), elle grandit vers le bas et son titre ne bouge plus.
           `max-h`/`overflow-y-auto` : filet pour les petits écrans en paysage. */
        className="top-[8vh] max-h-[84vh] max-w-[26rem] translate-y-0 overflow-y-auto border-border-subtle bg-overlay p-6 shadow-overlay sm:max-w-[26rem]"
      >
        {/* Titre et sous-titre CENTRÉS, toujours comme la référence : sans le
            `pr-8` qui compensait la croix de fermeture, le bloc n'est plus décalé. */}
        <DialogHeader className="space-y-1 text-center sm:text-center">
          <DialogTitle className="display-sm text-ink">{t('Bienvenue sur ZENKUU')}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-ink-muted">
            {mode === 'signup'
              ? t('Inscrivez-vous ou connectez-vous en quelques secondes.')
              : t('Connectez-vous ou inscrivez-vous en quelques secondes.')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <SocialButtons mode={mode} configured={socialProviders} />
        </div>

        <FieldSeparator className="my-5">{t('ou')}</FieldSeparator>

        {showEmail ? (
          /* `hideHeading` : la fenêtre porte déjà son titre, et deux titres empilés se
             contrediraient — « Bienvenue » suivi de « Se connecter ». */
          <LoginForm visible={open} density="overlay" hideHeading />
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center"
            onClick={() => setShowEmail(true)}
          >
            <Mail aria-hidden="true" />
            {t('Continuer par e-mail')}
          </Button>
        )}

        {/*
          ⚠️ LA RÉFÉRENCE RENVOIE VERS SES CONDITIONS ET SA POLITIQUE DE
          CONFIDENTIALITÉ. Ces deux pages N'EXISTENT PAS ici : les lier produirait deux
          404 au moment précis où l'on demande d'accepter quelque chose. La mention dit
          donc ce que le compte fait réellement, et renvoie vers la méthodologie, qui
          existe. À remplacer par les deux liens le jour où les pages sont écrites.
        */}
        <p className="mt-5 text-xs leading-relaxed text-ink-muted">
          {t(
            'Un compte ZENKUU sert à retrouver votre liste de suivi d’un appareil à l’autre. Le site n’exécute aucun ordre et ne détient aucun fonds.',
          )}{' '}
          <Link
            href="/a-propos"
            onClick={onClose}
            className="underline underline-offset-2 hover:text-ink"
          >
            {t('À propos de ZENKUU')}
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  )
}
