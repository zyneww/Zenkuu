'use client'

import { useRestitutionDuFocus } from '@/components/ui/focus-restitution'
import { useState } from 'react'

import { PasswordForm } from '@/components/account/PasswordForm'
import { ZenkuuMark } from '@/components/BrandMark'

import { LoginForm } from '@/components/account/LoginForm'
import { SocialButtons } from '@/components/account/SocialButtons'
import type { AuthMode } from '@/components/account/auth-mode'
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
   * ══════════════════════════════════════════════════════════════════════════
   * TROIS ÉCRANS, ET LE MOT DE PASSE EST LE PREMIER
   * ══════════════════════════════════════════════════════════════════════════
   *
   *   `password`  adresse et mot de passe — l'écran de la capture ;
   *   `code`      le parcours par courriel, recours de « oublié ou jamais défini » ;
   *   `providers` rien de plus : les fournisseurs sont TOUJOURS visibles, sous le
   *               formulaire, quel que soit l'écran.
   *
   * ⚠️ L'ORDRE S'INVERSE PAR RAPPORT À LA VERSION PRÉCÉDENTE, qui montrait les
   * fournisseurs d'abord et cachait le champ derrière un bouton « Continuer par
   * e-mail ». Sa note disait vrai : « un champ ouvert impose une saisie à qui venait
   * cliquer sur Google ».
   *
   * Cet argument tombe dès lors qu'un mot de passe existe. Le formulaire n'est plus une
   * demande d'adresse suivie d'une attente de courriel — c'est une connexion complète,
   * en deux champs, que les gestionnaires de mot de passe remplissent d'eux-mêmes. Le
   * cacher ferait chercher la porte principale derrière un bouton.
   *
   * L'état est REMIS À ZÉRO à la fermeture par la `key` posée sur le contenu : rouvrir
   * la fenêtre doit revenir au mot de passe, pas au code que la visite précédente avait
   * demandé.
   */
  const [ecran, setEcran] = useState<'password' | 'code'>('password')

  const restitution = useRestitutionDuFocus()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        key={open ? 'ouverte' : 'fermée'}
        /* Rend le focus au bouton qui a ouvert cette fenêtre : elle est CONTRÔLÉE et
           n'a pas de `DialogTrigger`, donc Radix ne sait pas à qui le rendre et le
           laisse sur `<body>`. Voir `useRestitutionDuFocus`. */
        {...restitution}
        /* ⚠️ CENTRÉE, ET NON PLUS ANCRÉE EN HAUT (demande explicite).

           La note précédente justifiait `top-[8vh]` par un défaut réel : « le titre
           part vers le milieu de l'écran quand le champ d'adresse se déplie ». Il
           n'existe plus, parce que le formulaire ne se déplie plus — il est là dès
           l'ouverture, et la fenêtre garde donc sa hauteur du début à la fin.

           `max-h`/`overflow-y-auto` : filet pour les petits écrans en paysage, où même
           une fenêtre de hauteur fixe peut dépasser. */
        className="max-h-[90vh] max-w-[26rem] overflow-y-auto border-border-subtle bg-overlay p-6 shadow-overlay sm:max-w-[26rem]"
      >
        <DialogHeader className="space-y-2 text-center sm:text-center">
          {/* ── LA PASTILLE DE MARQUE ────────────────────────────────────────
              Elle vient de la capture, et elle fait deux choses qu'un titre seul ne
              fait pas : elle dit À QUEL SITE on donne son mot de passe — ce qu'une
              fenêtre flottante, détachée de la page, cesse de rendre évident — et elle
              donne au bloc un point de départ vertical.

              Le monogramme du site, pas un pictogramme générique : un cadenas ou une
              clé décriraient l'action, que le titre dit déjà. */}
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-brand-soft">
            <ZenkuuMark className="h-6 w-6 text-brand-strong" />
          </span>

          {/* « Connexion à ZENKUU » et non « Connexion » : la capture NOMME le site
              dans son titre, et c'est la seule ligne de la fenêtre qui le fasse en
              toutes lettres. Sur une fenêtre flottante détachée de la page, savoir à
              qui l'on donne son mot de passe n'est pas un détail de style. */}
          <DialogTitle className="display-sm text-ink">
            {mode === 'signup' ? t('Créer un compte') : t('Connexion à ZENKUU')}
          </DialogTitle>
          {/*
            ⚠️ LA DESCRIPTION N'EST PLUS AFFICHÉE, mais elle EXISTE toujours.

            La capture n'a rien entre le titre et le premier champ — et pour cause :
            « Entrez vos identifiants pour vous connecter » ne dit rien que les deux
            champs juste en dessous ne disent déjà, avec leurs intitulés.

            La supprimer PUREMENT n'était pas une option : `DialogContent` de Radix
            avertit en console quand aucune description n'est associée, et surtout un
            lecteur d'écran annonce alors la fenêtre par son seul titre. `sr-only` la
            garde pour la synthèse vocale et la retire de l'œil, ce qui est exactement
            la distinction que la capture demande.
          */}
          <DialogDescription className="sr-only">
            {ecran === 'code'
              ? t('Entrez votre adresse : un code à usage unique vous sera envoyé.')
              : t('Entrez vos identifiants pour vous connecter.')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          {ecran === 'password' ? (
            <PasswordForm visible={open} onForgot={() => setEcran('code')} />
          ) : (
            /* `hideHeading` : la fenêtre porte déjà son titre, et deux titres empilés
               se contrediraient — « Connexion » suivi de « Se connecter ». */
            <LoginForm visible={open} density="overlay" hideHeading />
          )}
        </div>

        {/* Le retour, offert seulement depuis l'écran de code : l'aller a son propre
            lien, contre l'intitulé du champ. Sans lui, on ne reviendrait au mot de
            passe qu'en refermant la fenêtre. */}
        {ecran === 'code' ? (
          <button
            type="button"
            onClick={() => setEcran('password')}
            className="mt-3 w-full text-center text-xs text-ink-muted underline underline-offset-2 transition-colors duration-150 hover:text-brand"
          >
            {t('Revenir au mot de passe')}
          </button>
        ) : null}

        <FieldSeparator className="my-5">{t('ou')}</FieldSeparator>

        <SocialButtons mode={mode} configured={socialProviders} />

        {/*
          ── LA LIGNE D'AIDE, ET CE QU'ELLE NE PEUT PAS DIRE ──────────────────

          La capture ferme sur « Still can't sign in? Email us », où « Email us » ouvre
          une adresse de support.

          ⚠️ CE SITE N'EN PUBLIE AUCUNE. Il n'existe ni `mailto:` ni adresse de contact
          nulle part dans le dépôt, et en inventer une donnerait un lien qui n'aboutit
          pas — au moment précis où quelqu'un n'arrive pas à se connecter, c'est-à-dire
          le pire endroit du site pour une promesse creuse.

          Le renvoi va donc au centre d'aide, qui existe et qui répond à la question. À
          remplacer par l'adresse le jour où il y en a une.
        */}
        <p className="mt-5 text-center text-xs text-ink-muted">
          {t('Toujours pas connecté ?')}{' '}
          <Link
            href="/aide"
            onClick={onClose}
            className="text-brand underline underline-offset-2 hover:opacity-80"
          >
            {t('Centre d’aide')}
          </Link>
        </p>

        {/*
          ⚠️ LA RÉFÉRENCE RENVOIE VERS SES CONDITIONS ET SA POLITIQUE DE
          CONFIDENTIALITÉ. Ces deux pages N'EXISTENT PAS ici : les lier produirait deux
          404 au moment précis où l'on demande d'accepter quelque chose. La mention dit
          donc ce que le compte fait réellement, et renvoie vers la méthodologie, qui
          existe. À remplacer par les deux liens le jour où les pages sont écrites.
        */}
        {/* La mention de ce qu'un compte apporte passe SOUS la ligne d'aide et se
            resserre : elle reste utile — c'est le §5 qui impose de dire que le site
            n'exécute aucun ordre — mais elle n'est plus la dernière chose qu'on lit
            avant de renoncer. */}
        <p className="mt-3 text-center text-micro leading-relaxed text-ink-muted">
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
