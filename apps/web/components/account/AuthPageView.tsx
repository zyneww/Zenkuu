import { Fingerprint, QrCode, Users } from 'lucide-react'

/* `Link` de `@/i18n/navigation` et non de `next/link` : le second poserait
   « /inscription » sans préfixe de langue, ce qui renverrait un lecteur anglophone
   sur la version française à chaque bascule entre les deux pages. */
import { Link } from '@/i18n/navigation'

import { AuthAside } from '@/components/account/AuthAside'
import type { AuthMode } from '@/components/account/auth-mode'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/account/LoginForm'
import { SocialButtons } from '@/components/account/SocialButtons'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES PAGES DE CONNEXION ET D'INSCRIPTION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Une seule composition pour les deux : elles ne diffèrent que par leur titre, leur
 * phrase d'accroche et le lien croisé du bas. Le formulaire, lui, est rigoureusement
 * le même — voir plus bas.
 *
 * ── CES PAGES REVIENNENT APRÈS AVOIR ÉTÉ SUPPRIMÉES ────────────────────────
 *
 * `/connexion` et `/inscription` avaient été retirées au profit de la fenêtre du menu
 * de compte, au motif qu'une page fait QUITTER ce qu'on regardait. Ce motif reste
 * valable et la fenêtre reste le chemin par défaut : elle n'est pas remplacée.
 *
 * ⚠️ CES PAGES S'AJOUTENT, ELLES NE SE SUBSTITUENT PAS. `AccountControl` continue
 * d'ouvrir `AuthDialog` au clic sur « Se connecter ». Ce que les pages apportent est
 * une ADRESSE : un lien de connexion partagé, un signet, un retour d'OAuth, une
 * redirection depuis une route protégée — autant de cas où il n'y a pas de fenêtre à
 * ouvrir parce qu'il n'y a pas eu de clic.
 *
 * ── CE QUI EST GRISÉ, ET POURQUOI ÇA RESTE AFFICHÉ ─────────────────────────
 *
 * La référence propose six chemins d'entrée. Ce site en sert deux. Les quatre autres
 * sont DESSINÉS ET DÉSACTIVÉS, avec leur raison au survol, plutôt que masqués :
 *
 *   · Sous-compte — il n'existe pas de comptes hiérarchiques ici, et il n'en
 *     existera pas : c'est une notion de plateforme d'échange, où un gérant ouvre des
 *     comptes de négociation cloisonnés. Un site en lecture seule n'a rien à
 *     cloisonner (§1, §7).
 *   · Code QR — il suppose une application mobile qui scanne et confirme. Il n'y en a
 *     pas.
 *   · Clé d'accès — WebAuthn n'est pas branché. C'est en revanche la suite naturelle :
 *     le site est DÉJÀ sans mot de passe, la clé d'accès remplacerait l'aller-retour
 *     par courriel.
 *   · Apple — décision déjà prise et déjà documentée dans `SocialButtons`.
 *
 * Les masquer donnerait à croire que ces chemins n'existent nulle part ; les afficher
 * actifs serait une fausse fonctionnalité. Grisés et motivés, ils disent l'état exact
 * des choses — ce qui est la règle du site (§5).
 *
 * ⚠️ IL N'Y A NI TELEGRAM NI AUCUN QUATRIÈME FOURNISSEUR. La référence en aligne un
 * de plus ; l'ajouter demanderait de recopier sa marque dans le dépôt pour un bouton
 * qui ne mènerait nulle part. Les logotypes de `social-logos.tsx` ne sont là que parce
 * qu'une charte d'authentification l'exige pour un fournisseur avec lequel on
 * s'authentifie vraiment.
 *
 * ── UN SEUL FORMULAIRE POUR « SE CONNECTER » ET « S'INSCRIRE » ─────────────
 *
 * `mode` ne change PAS le formulaire, et c'est volontaire : la même adresse suit le
 * même chemin qu'elle soit connue ou non, et le code reçu vaut vérification dans les
 * deux cas. Voir l'en-tête de `LoginForm`. `mode` ne pilote donc que la formulation —
 * et il voyage jusqu'au retour d'OAuth, où « bienvenue » n'est pas « content de vous
 * revoir ».
 */
export async function AuthPageView({
  mode,
  /** Fournisseurs OAuth réellement configurés côté serveur — voir `lib/oauth.ts`. */
  configured,
  /**
   * La connexion est-elle servie par cette instance ?
   *
   * Elle exige une base ET un serveur de courriel (`ACCOUNTS_ENABLED`). Sans eux, le
   * formulaire partirait quand même et reviendrait une seconde plus tard sur « la
   * connexion n'est pas configurée » — on le dit donc AVANT la saisie, pas après.
   */
  enabled,
}: {
  mode: AuthMode
  configured: readonly string[]
  enabled: boolean
}) {
  const t = await getPhrase()
  const signup = mode === 'signup'

  return (
    /*
      ── LA PAGE SORT DE LA COLONNE ────────────────────────────────────────────

      `main` porte `.shell py-6` : sans `.bleed`, le panneau sombre s'arrêterait à
      1 680 px avec deux marges claires de part et d'autre, et se lirait comme un très
      grand encadré au lieu d'un demi-écran. `-my-6` annule la respiration verticale
      du gabarit, pour que le panneau touche la barre de navigation.

      L'en-tête et le pied de page RESTENT. La référence occupe tout l'écran ; ici,
      les retirer couperait la navigation du site sur deux pages qu'on peut atteindre
      par un lien — et laisserait sans issue quelqu'un qui n'a pas de compte.
    */
    <div className="bleed -my-6 grid lg:min-h-[38rem] lg:grid-cols-2">
      <AuthAside
        slogan={t('D’abord comprendre. Ensuite décider.')}
        tagline={t(
          'Les cotations, les classements et les listes de suivi de ZENKUU s’utilisent sans compte. Celui-ci ne sert qu’à les emporter d’un appareil à l’autre.',
        )}
      />

      <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-sm space-y-6">
          <header className="space-y-2">
            <h1 className="display-md text-ink">{signup ? t('Créer un compte') : t('Se connecter')}</h1>
            <p className="text-sm leading-relaxed text-ink-muted">
              {signup
                ? t('Une adresse électronique suffit. Pas de mot de passe à choisir, pas de vérification d’identité — il n’y a ni fonds ni ordre à protéger ici.')
                : t('Saisissez l’adresse de votre compte : un code à six chiffres vous y attend.')}
            </p>
          </header>

          {enabled ? null : (
            <p
              role="status"
              className="rounded-card border border-border-subtle bg-surface-muted px-3 py-2.5 text-xs leading-relaxed text-ink-muted"
            >
              {t('Les comptes ne sont pas activés sur cette instance : le formulaire ci-dessous n’enverra rien. Tout le reste du site fonctionne normalement, et vos listes de suivi restent enregistrées dans ce navigateur.')}
            </p>
          )}

          <MethodTabs />

          {/* `hideHeading` : l'en-tête ci-dessus annonce déjà l'action. Sans lui, la
              page porterait deux titres empilés dont le second contredirait parfois le
              premier — « Créer un compte » suivi de « Se connecter ». */}
          <LoginForm density="panel" hideHeading />

          <Separator label={t('Ou continuer avec')} />

          {/*
            LA CLÉ D'ACCÈS EST SEULE SUR SA LIGNE, comme dans la référence : ce n'est
            pas un fournisseur d'identité mais une méthode, et l'aligner avec Google
            laisserait croire qu'elle délègue à un tiers alors qu'elle fait exactement
            l'inverse.
          */}
          <Button
            variant="outline"
            size="lg"
            disabled
            className="w-full justify-center"
            title={t('Clé d’accès — pas encore branchée sur ce site.')}
          >
            <Fingerprint className="size-5" aria-hidden="true" />
            {t('Clé d’accès')}
          </Button>

          <SocialButtons mode={mode} configured={configured} layout="row" />

          <p className="text-center text-sm text-ink-muted">
            {signup ? t('Vous avez déjà un compte ?') : t('Pas encore de compte ?')}{' '}
            <Link
              href={signup ? '/connexion' : '/inscription'}
              className="font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              {signup ? t('Se connecter') : t('S’inscrire')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Les trois onglets de méthode.
 *
 * ── POURQUOI CE N'EST PAS UN COMPOSANT `Tabs` ──────────────────────────────
 *
 * `components/ui/tabs.tsx` gère une SÉLECTION : il tient l'onglet actif, déplace le
 * focus aux flèches et bascule les panneaux. Il n'y a rien à basculer ici — deux des
 * trois onglets ne mèneront jamais à un panneau, et le troisième est toujours actif.
 * Monter une machine à états pour un seul état vaudrait un composant client de plus
 * sur une page qui n'en a pas besoin.
 *
 * Le rendu est donc du balisage statique, et le filet sous l'onglet actif est une
 * bordure plutôt qu'un indicateur mesuré : rien ne bouge, rien à mesurer.
 */
async function MethodTabs() {
  const t = await getPhrase()

  return (
    <div
      /* `role="tablist"` SERAIT UN MENSONGE ici : la synthèse vocale annoncerait
         « onglet 1 sur 3 » et proposerait de naviguer aux flèches vers deux onglets
         qui ne s'ouvriront pas. Un groupe nommé décrit ce qui est réellement là. */
      role="group"
      aria-label={t('Méthodes de connexion')}
      className="flex items-center gap-4 border-b border-border-subtle"
    >
      {/* `pt-1.5` sur les trois onglets, et pas seulement pour l'allure : les deux
          onglets désactivés sont de vrais `<button>`, et l'audit responsive du projet
          refuse une cible tactile de moins de 32 pixels. Sans cette ligne ils en font
          30. L'onglet actif la reprend pour que les trois lignes de base coïncident. */}
      <span className="-mb-px border-b-2 border-ink pb-2.5 pt-1.5 text-sm font-semibold text-ink">
        {t('Adresse électronique')}
      </span>

      <DisabledMethod
        icon={<Users className="size-3.5" aria-hidden="true" />}
        label={t('Sous-compte')}
        reason={t('Les sous-comptes appartiennent aux plateformes d’échange : ZENKUU ne détient ni fonds ni ordre à cloisonner.')}
      />

      <DisabledMethod
        icon={<QrCode className="size-3.5" aria-hidden="true" />}
        label={t('Code QR')}
        reason={t('La connexion par code QR suppose une application mobile qui confirme. ZENKUU n’en publie pas.')}
      />
    </div>
  )
}

function DisabledMethod({
  icon,
  label,
  reason,
}: {
  icon: React.ReactNode
  label: string
  reason: string
}) {
  return (
    /*
      ⚠️ UN `<button disabled>` ET NON UN `<span>` GRISÉ. Le second se lit comme du
      texte d'ambiance : rien n'indique qu'il y avait là quelque chose à cliquer, et
      la synthèse vocale ne l'annonce pas du tout. Le premier est annoncé
      « indisponible », et son `title` porte la raison au survol.

      `pb-2.5` aligne sa ligne de base sur l'onglet actif, dont le filet occupe le
      même espace.
    */
    <button
      type="button"
      disabled
      title={reason}
      className="flex cursor-not-allowed items-center gap-1.5 pb-2.5 pt-1.5 text-sm text-ink-muted/70"
    >
      {icon}
      {label}
    </button>
  )
}

function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
    </div>
  )
}
