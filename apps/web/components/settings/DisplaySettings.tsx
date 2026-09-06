'use client'

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Languages,
  LayoutGrid,
  MonitorCog,
  Moon,
  Sun,
  SunMedium,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { usePhrase } from '@/components/locale/ContentProvider'
import { currencyFlag, languageFlag } from '@/components/settings/flags'
import { getLanguage, LANGUAGES } from '@/components/settings/languages'
import { SegmentedControl } from '@/components/settings/SegmentedControl'
import { useLanguageChoice } from '@/components/settings/useLanguageChoice'
import { useSettings, type LayoutMode, type ThemeMode } from '@/lib/stores/settings'
import { getCurrency, type CurrencyGroup } from '@zenkuu/data'

/**
 * Intitulés des groupes, et l'ORDRE dans lequel ils se suivent.
 *
 * ⚠️ CETTE TABLE EST UN DOUBLON ASSUMÉ de celle de `PreferenceOverlay`, et le doublon
 * est le moindre mal : la fenêtre plein écran n'expose pas les siennes, et les en
 * extraire pour deux consommateurs créerait un troisième fichier pour dix lignes.
 *
 * Ce qui DIVERGE volontairement, c'est l'ordre. La fenêtre ne propose qu'un groupe —
 * les devises courantes — parce qu'elle affichait quarante pastilles sur deux écrans.
 * Ce menu-ci est une LISTE qui défile : la contrainte ne s'y applique pas, et il rend
 * donc les monnaies et les cryptomonnaies atteignables, ce qu'elle ne fait plus.
 */
const GROUP_LABELS: Record<CurrencyGroup, string> = {
  suggested: 'Devises courantes',
  fiat: 'Monnaies',
  crypto: 'Cryptomonnaies',
  bitcoin: 'Unités bitcoin',
  commodity: 'Matières premières',
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UN SEUL GROUPE EST PROPOSÉ : LES DEVISES COURANTES (demande explicite)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le panneau en offrait cinq — courantes, monnaies, cryptomonnaies, unités bitcoin,
 * matières premières — soit une soixantaine d'entrées dans une liste qui se parcourt
 * au doigt depuis l'en-tête.
 *
 * ⚠️ LA FENÊTRE `/parametres` AVAIT DÉJÀ FAIT CE CHOIX, ET LES DEUX DIVERGEAIENT.
 * `PreferenceOverlay` porte `CURRENCY_GROUP_ORDER = ['suggested']` depuis une
 * décision antérieure, avec sa propre note. Le panneau de l'en-tête, lui, était resté
 * complet : le même site proposait donc soixante devises à un endroit et dix à un
 * autre. Les deux disent désormais la même chose.
 *
 * ⚠️ CE QUE CELA RETIRE VRAIMENT, ET IL FAUT LE SAVOIR EN LISANT CE FICHIER.
 *
 * Ce n'est pas un repli d'affichage : les autres devises deviennent INATTEIGNABLES,
 * y compris par la recherche, qui ne filtre que ce que les groupes ci-dessous
 * produisent. BTC et ETH en font partie — c'est ce qui rend leur place légitime dans
 * les réglages du GRAPHIQUE, où l'exploitant les a demandés : ils n'y font plus
 * doublon avec un sélecteur global qui ne les propose plus.
 *
 * Les taux, eux, restent chargés et convertibles : c'est bien un choix d'INTERFACE,
 * et le rétablir consiste à remettre une ou plusieurs clés dans le tableau ci-dessous.
 * Rien d'autre n'a à changer.
 *
 * La table `GROUP_LABELS` reste COMPLÈTE au-dessus : elle décrit le catalogue, pas le
 * panneau, et `CurrencyGroup` exige de toute façon ses cinq clés.
 */
const GROUP_ORDER: CurrencyGroup[] = ['suggested']

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES RÉGLAGES D'AFFICHAGE — TROIS LIGNES, ET DEUX ÉCRANS QUI GLISSENT DESSOUS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── D'OÙ CE BLOC VIENT ────────────────────────────────────────────────────────
 *
 * Il occupait une roue dentée à lui, entre la recherche et le compte. Trois boutons se
 * suivaient donc dans l'en-tête, et le premier était le seul dont l'icône ne dît rien
 * de ce qu'elle ouvrait. Les deux ont fusionné ; ce bloc est ce qui reste, et il sert
 * le panneau du visiteur anonyme comme celui du visiteur connecté.
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI CE N'EST PAS UN HABILLAGE ────────────────────
 *
 * Le bloc rendait DEUX lignes de renvoi (langue, devise) plus une rangée de trois
 * boutons de thème. Les deux renvois ouvraient une FENÊTRE PLEIN ÉCRAN : cliquer
 * « Devise » fermait le menu, voilait la page et affichait une grille de soixante-deux
 * pastilles cherchables. Passer de l'euro au dollar — le geste le plus courant du
 * site — coûtait donc une modale.
 *
 * Les deux choix se font désormais SUR PLACE, dans un écran qui glisse à l'intérieur
 * du même panneau, avec une flèche de retour en tête. C'est la forme de la référence,
 * et elle tient parce que ces listes sont longues mais PLATES : on y cherche une
 * ligne, pas une comparaison. Un panneau de 288 pixels qui défile suffit à cela ;
 * c'est la fenêtre plein écran qui était disproportionnée.
 *
 * ⚠️ LA FENÊTRE DE PRÉFÉRENCES N'EST PAS SUPPRIMÉE. Elle vit toujours sur
 * `/parametres`, avec sa recherche et ses groupes, et reste le bon outil pour qui veut
 * parcourir le catalogue. Ce menu-ci est le chemin COURT, pas son remplaçant.
 *
 * ── LE THÈME EST REVENU À TROIS CHOIX, EN PICTOGRAMMES ────────────────────────
 *
 * Il avait été réduit à un interrupteur à deux positions, ce qui retirait « Système »
 * du menu : un lecteur qui en sortait ne pouvait plus y revenir sans ouvrir
 * `/parametres`. La rangée soleil / lune / écran rend les trois, dans la place que
 * prenait l'interrupteur.
 *
 * ── ET UNE QUATRIÈME LIGNE : L'AFFICHAGE ─────────────────────────────────────
 *
 * « Compact » (le défaut, 1 680 px centrés) ou « Étirée » (toute la largeur, à la
 * manière de CoinMarketCap). Le réglage ne touche QUE les fiches d'actif — voir
 * `LayoutMode` dans le magasin, et la règle `:has([data-asset-page])` de
 * `globals.css`.
 */

export function DisplaySettings({
  onNavigate,
}: {
  /**
   * Referme le panneau qui contient ce bloc.
   *
   * Appelé sur le choix d'une langue — qui provoque une navigation — et sur rien
   * d'autre. Le thème et la devise s'appliquent SANS fermer : ce sont des réglages
   * qu'on ajuste en regardant leur effet, et refermer le menu masquerait la page dont
   * on vient de changer les couleurs.
   */
  onNavigate: () => void
}) {
  /* ⚠️ CE BLOC RENDAIT SES LIBELLÉS EN FRANÇAIS SUR TOUT LE SITE — relevé sur `/en`,
     où le menu affichait « Devise », « Langue », « Clair », « Sombre » au milieu d'une
     interface anglaise. Les chaînes vivent en français dans le code, comme partout
     ici ; c'est `usePhrase` qui les traduit, et il manquait. */
  const t = usePhrase()
  const { theme, setTheme, layout, setLayout } = useSettings()
  /* ⚠️ LA LANGUE VIENT DE LA ROUTE, PLUS DU MAGASIN. `useSettings().setLanguage`
     n'écrivait qu'une clé de stockage : choisir « English » refermait ce menu et
     laissait la page en français, tout en affichant « EN » sur la ligne. Voir
     `useLanguageChoice`, qui navigue et lit la langue réellement servie. */
  const { language, setLanguage } = useLanguageChoice()
  const { currency, setCurrency, available } = useCurrency()

  /*
   * L'écran affiché. `null` est la racine — les trois lignes.
   *
   * Un état LOCAL et non remonté à l'appelant : personne d'autre n'a besoin de savoir
   * quel sous-écran est ouvert, et le remonter obligerait chaque panneau qui inclut ce
   * bloc à le porter. Il se remet à zéro à chaque montage, donc à chaque ouverture du
   * menu — c'est le comportement voulu, un menu rouvert doit montrer sa racine.
   */
  const [view, setView] = useState<'root' | 'currency' | 'language'>('root')

  /*
   * ⚠️ IL N'Y A PLUS D'ÉTAT « SOMBRE OU NON » ICI, ET C'EST VOULU.
   *
   * L'ancien interrupteur devait deviner ce que la page PORTAIT (la classe `dark` sur
   * `<html>`), puisque `theme === 'dark'` est faux sur une page sombre suivie du
   * système. Les trois pictogrammes, eux, montrent le RÉGLAGE — trois valeurs, trois
   * boutons — et n'ont donc rien à lire dans le DOM, ni d'effet à faire tourner après
   * le montage.
   */

  if (view === 'currency') {
    return (
      <Screen title={t('Choisir la devise')} onBack={() => setView('root')}>
        <CurrencyList
          current={currency}
          available={available}
          onPick={(code) => setCurrency(code)}
        />
      </Screen>
    )
  }

  if (view === 'language') {
    return (
      <Screen title={t('Choisir la langue')} onBack={() => setView('root')}>
        <LanguageList
          current={language}
          onPick={(code) => {
            setLanguage(code)
            onNavigate()
          }}
        />
      </Screen>
    )
  }

  const currentLanguage = getLanguage(language)

  return (
    <div className="p-1.5">
      <Row
        icon={<Coins className="h-4 w-4" aria-hidden="true" />}
        label={t('Devise')}
        value={currency.toUpperCase()}
        flag={currencyFlag(currency)}
        onClick={() => setView('currency')}
      />

      <Row
        icon={<Languages className="h-4 w-4" aria-hidden="true" />}
        label={t('Langue')}
        /* Le CODE et non l'endonyme : « EN », « FR », « 中文 » n'ont pas la même
           longueur, et une valeur qui change de largeur d'une langue à l'autre fait
           danser la ligne. Le nom complet vit dans l'écran suivant. */
        value={language.toUpperCase()}
        flag={languageFlag(language)}
        title={currentLanguage?.label}
        onClick={() => setView('language')}
      />

      {/*
        ── L'APPARENCE REDEVIENT UN CHOIX À TROIS, EN ICÔNES ──────────────────

        L'interrupteur à deux positions retirait « Système » du menu : un lecteur qui
        en sortait ne pouvait plus y revenir sans passer par `/parametres`. Les trois
        pictogrammes le rendent — soleil, lune, et le cercle mi-plein qui dit
        « suivre l'appareil », convention que macOS, GitHub et Linear partagent.

        Ce n'est pas un renvoi : les trois boutons appliquent sur place, la ligne ne
        s'ouvre sur rien.
      */}
      <div className="flex items-center gap-2.5 rounded-card px-2 py-2 text-sm text-ink">
        <span className="shrink-0 text-ink-muted">
          <SunMedium className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex-1 text-left">{t('Apparence')}</span>

        {/* L'état ACTIF suit le réglage MÉMORISÉ, pas la couleur affichée : c'est le
            seul moyen de distinguer « Sombre » de « Système sur un appareil sombre »,
            qui donnent la même page. */}
        <SegmentedControl
          ariaLabel={t('Apparence')}
          value={theme}
          onChange={setTheme}
          className="w-[5.25rem]"
          options={THEME_CHOICES.map((choice) => {
            const Icon = choice.icon
            return {
              value: choice.value,
              a11yLabel: t(choice.label),
              icon: <Icon className="h-3.5 w-3.5" aria-hidden="true" />,
            }
          })}
        />
      </div>

      {/*
        ── L'AFFICHAGE : COMPACT OU ÉTIRÉ ─────────────────────────────────────

        C'ÉTAIT UN RENVOI vers un sous-écran, au motif que deux options portant chacune
        une phrase d'explication ne tiennent pas sur une ligne de 288 pixels. La phrase
        était le problème, pas la ligne : « Compact » et « Étirée » se comprennent en se
        voyant appliquer, et le sous-écran coûtait deux clics et une lecture pour un
        réglage à deux valeurs.
      */}
      <div className="flex items-center gap-2.5 rounded-card px-2 py-2 text-sm text-ink">
        <span className="shrink-0 text-ink-muted">
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex-1 text-left">{t('Affichage')}</span>

        <SegmentedControl
          ariaLabel={t('Affichage')}
          value={layout}
          onChange={setLayout}
          /* Assez large pour que « Compact » et « Étirée » — et leurs traductions,
             plus longues en allemand — tiennent SANS troncature : un segment coupé en
             « Comp… » ne se lit plus, et c'est le seul mot qui distingue les deux. */
          className="w-[10.5rem]"
          options={LAYOUT_CHOICES.map((choice) => ({
            value: choice.value,
            label: t(choice.label),
            a11yLabel: t(choice.description),
          }))}
        />
      </div>
    </div>
  )
}

/**
 * Les trois apparences, et l'icône qui les dit.
 *
 * `MonitorCog` et non un troisième glyphe météo pour « Système » : ce mode ne décrit
 * pas une lumière mais une DÉLÉGATION — « ce que l'appareil décide ». Un écran est le
 * pictogramme que les systèmes eux-mêmes emploient pour cela.
 */
const THEME_CHOICES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Suivre l’appareil', icon: MonitorCog },
]

/** Les deux largeurs de fiche, avec ce que chacune change réellement. */
const LAYOUT_CHOICES: { value: LayoutMode; label: string; description: string }[] = [
  {
    value: 'compact',
    label: 'Compact',
    description:
      'La barre de navigation et la fiche se bornent à 1 680 px et se centrent, à la manière de CoinGecko. C’est l’affichage par défaut.',
  },
  {
    value: 'wide',
    label: 'Étirée',
    description:
      'La barre de navigation et la fiche occupent toute la largeur de l’écran, à la manière de CoinMarketCap. Les autres pages ne changent pas.',
  },
]

/** L'écran secondaire : un en-tête à flèche de retour, puis une liste qui défile. */
function Screen({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: React.ReactNode
}) {
  const t = usePhrase()

  return (
    <div className="p-1.5">
      <div className="flex items-center gap-1 pb-1">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('Revenir aux réglages')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-card text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        {/* Le titre est CENTRÉ et la flèche flotte à sa gauche : c'est la disposition
            d'un écran secondaire, qui dit « vous êtes entré quelque part ». Le
            `pr-7` compense la flèche pour que le centrage soit optique. */}
        <p className="flex-1 pr-7 text-center text-sm font-semibold text-ink">{title}</p>
      </div>

      {/* `max-h` et non `h` : une liste de quatre langues ne doit pas laisser deux
          cents pixels de vide sous elle. */}
      <div className="max-h-72 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  )
}

function CurrencyList({
  current,
  available,
  onPick,
}: {
  current: string
  available: readonly string[]
  onPick: (code: string) => void
}) {
  /*
   * `available` FAIT FOI, pas le catalogue : on ne propose que ce qu'on sait
   * convertir. Le catalogue ne sert qu'à retrouver le groupe et le nom — proposer une
   * devise sans taux afficherait des montants faux, ce qui est pire que de ne pas la
   * proposer du tout (§5).
   */
  const groups = useMemo(() => {
    const usable = new Set(available)
    return GROUP_ORDER.map((group) => ({
      title: GROUP_LABELS[group],
      codes: available.filter(
        (code) => usable.has(code) && getCurrency(code)?.group === group,
      ),
    })).filter((entry) => entry.codes.length > 0)
  }, [available])

  const t = usePhrase()

  return (
    <>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-2 pb-1 pt-2 text-micro font-semibold text-ink-muted">
            {t(group.title)}
          </p>
          {group.codes.map((code) => (
            <PickRow
              key={code}
              flag={currencyFlag(code)}
              code={code.toUpperCase()}
              name={getCurrency(code)?.fallbackName ?? ''}
              selected={code === current}
              onClick={() => onPick(code)}
            />
          ))}
        </div>
      ))}
    </>
  )
}

function LanguageList({
  current,
  onPick,
}: {
  current: string
  onPick: (code: string) => void
}) {
  /* Seules les langues RÉELLEMENT traduites : `ready` distingue une étiquette
     déclarée d'un fichier de messages existant, et proposer la seconde sans le
     premier mènerait à une page vide. Voir `languages.ts`. */
  const usable = LANGUAGES.filter((entry) => entry.ready)

  return (
    <>
      {usable.map((entry) => (
        <PickRow
          key={entry.code}
          flag={languageFlag(entry.code)}
          code={entry.code.toUpperCase()}
          name={entry.label}
          selected={entry.code === current}
          onClick={() => onPick(entry.code)}
        />
      ))}
    </>
  )
}

/**
 * Une ligne de choix : drapeau, code, nom, et la coche du choix courant.
 *
 * Le CODE est en tête et en gras, le nom le suit en gris. C'est l'ordre d'une liste
 * qu'on balaye : les codes ont tous deux ou trois lettres et s'alignent, les noms non.
 */
function PickRow({
  flag,
  code,
  name,
  selected,
  onClick,
}: {
  flag: string | null
  code: string
  name: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-card px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-surface-muted ${
        selected ? 'text-brand-strong' : 'text-ink'
      }`}
    >
      {/* Largeur RÉSERVÉE même sans drapeau : les métaux précieux n'en ont pas (voir
          `flags.ts`), et sans cette largeur leur ligne décalerait tout le texte. */}
      <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden="true">
        {flag}
      </span>
      <span className="font-semibold">{code}</span>
      <span className="min-w-0 flex-1 truncate text-left text-xs text-ink-muted">{name}</span>
      {selected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
      ) : null}
    </button>
  )
}

/** Ligne « réglage → valeur courante », qui ouvre l'écran correspondant. */
function Row({
  icon,
  label,
  value,
  flag,
  title,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  flag: string | null
  title?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      {...(title ? { title } : {})}
      className="flex w-full items-center gap-2.5 rounded-card px-2 py-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
    >
      <span className="shrink-0 text-ink-muted">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {flag ? (
        <span className="text-base leading-none" aria-hidden="true">
          {flag}
        </span>
      ) : null}
      <span className="text-xs font-medium text-ink-muted">{value}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
    </button>
  )
}
