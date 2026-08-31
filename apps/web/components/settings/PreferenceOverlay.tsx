'use client'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Check } from 'lucide-react'
import { Search } from 'lucide-react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useEffect, useMemo, useState } from 'react'

import { CURRENCIES, currencyName, type CurrencyGroup } from '@zenkuu/data/currencies'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { LANGUAGES } from '@/components/settings/languages'
import { useLanguageChoice } from '@/components/settings/useLanguageChoice'

/**
 * Fenêtre de préférences — langue et devise, en deux onglets.
 *
 * Reprend la structure de la référence : deux onglets en tête, un champ de recherche,
 * puis des groupes nommés en grille de quatre colonnes. Chaque cellule affiche le
 * CODE en tête, puis le libellé — c'est le code que l'œil balaie quand on cherche
 * « JPY » dans une liste de quarante-six monnaies, pas le nom.
 *
 * Le regroupement n'est pas décoratif : il place en premier les quelques choix que
 * la grande majorité des visiteurs fera, sans priver les autres de la liste complète.
 *
 * ── CE QUE LE SÉLECTEUR PROMET, ET CE QU'IL TIENT ─────────────────────────────
 *
 * Deux listes, deux régimes de vérité, et il faut les distinguer sous peine de
 * mentir dans un cas sur deux :
 *
 *   • Les DEVISES sont toutes réellement fonctionnelles. La liste n'est pas le
 *     catalogue mais `available`, c'est-à-dire les devises dont un taux a bien été
 *     reçu. Une source en panne retire sa part de la liste plutôt que d'offrir une
 *     conversion qui rendrait le montant inchangé sans le dire (§5).
 *
 *   • Les LANGUES sont toutes affichées, mais deux seulement sont traduites. Chaque
 *     langue non traduite porte donc une mention, et le pied de la fenêtre répète ce
 *     que le choix fait réellement. Le jour où une traduction arrive, la mention
 *     disparaît d'elle-même : elle est conditionnée au drapeau `ready` de l'entrée.
 */

export type PreferenceTab = 'language' | 'currency'

/**
 * Intitulés des groupes de devises.
 *
 * La table reste COMPLÈTE alors qu'un seul groupe est affiché — voir
 * `CURRENCY_GROUP_ORDER`. Elle décrit le catalogue, pas la fenêtre : la retailler
 * obligerait à la reconstruire le jour où un groupe revient, et `CurrencyGroup` exige
 * de toute façon les cinq clés.
 */
const CURRENCY_GROUP_LABELS: Record<CurrencyGroup, string> = {
  suggested: 'Devises courantes',
  fiat: 'Monnaies',
  crypto: 'Cryptomonnaies',
  bitcoin: 'Unités bitcoin',
  commodity: 'Matières premières',
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UN SEUL GROUPE EST PROPOSÉ : LES DEVISES COURANTES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La fenêtre en offrait cinq — courantes, monnaies, cryptomonnaies, unités bitcoin,
 * matières premières — soit une quarantaine d'entrées demandant deux écrans de
 * défilement. Décision de conception : s'en tenir aux dix courantes.
 *
 * ⚠️ CE QUE CELA RETIRE VRAIMENT, ET IL FAUT LE SAVOIR EN LISANT CE FICHIER.
 *
 * Ce n'est pas un simple repli d'affichage : les autres devises deviennent
 * INATTEIGNABLES, y compris par la recherche, qui ne filtre que ce que les groupes
 * ci-dessous produisent. Un visiteur suisse ne peut plus obtenir de francs, un
 * Britannique plus de livres, un Canadien plus de dollars canadiens.
 *
 * Les taux, eux, restent chargés et convertibles : c'est bien un choix d'INTERFACE, et
 * le rétablir consiste à remettre une ou plusieurs clés dans le tableau ci-dessous.
 * Rien d'autre n'a à changer.
 */
const CURRENCY_GROUP_ORDER: CurrencyGroup[] = ['suggested']

interface Item {
  key: string
  /** Affiché en tête de cellule, en petites capitales — c'est le repère de balayage. */
  code: string
  title: string
  selected: boolean
  note?: string
  group: string
}

export function PreferenceOverlay({
  tab,
  onTabChange,
  onClose,
}: {
  /** `null` ferme la fenêtre — l'état vit chez l'appelant. */
  tab: PreferenceTab | null
  onTabChange: (tab: PreferenceTab) => void
  onClose: () => void
}) {
  const t = usePhrase()
  const [query, setQuery] = useState('')
  /* Voir `useLanguageChoice` : le magasin ne navigue pas, la route fait foi. */
  const { language, setLanguage } = useLanguageChoice()
  const { currency, setCurrency, available } = useCurrency()


  // Le filtre repart à zéro à chaque changement d'onglet ET à chaque ouverture :
  // retrouver « eur » saisi dans l'onglet des devises en passant aux langues donne
  // une grille vide sans qu'on comprenne pourquoi.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- voir commentaire ci-dessus
    setQuery('')
  }, [tab])

  const groups = useMemo<Array<{ title: string; items: Item[] }>>(() => {
    if (tab === 'currency') {
      // `available` fait foi, pas le catalogue : on n'affiche que ce qu'on sait
      // convertir. Le catalogue ne sert qu'à retrouver le groupe et le libellé.
      const usable = new Set(available)

      return CURRENCY_GROUP_ORDER.map((group) => ({
        title: t(CURRENCY_GROUP_LABELS[group]),
        items: CURRENCIES.filter((meta) => meta.group === group && usable.has(meta.code)).map(
          (meta) => ({
            key: meta.code,
            code: meta.code,
            // Nom dérivé de la LANGUE COURANTE : « dollar des États-Unis » en
            // français, « US Dollar » en anglais, sans aucune table de traduction.
            title: currencyName(meta.code, language),
            selected: meta.code === currency,
            group,
          }),
        ),
      }))
    }

    const toItem = (entry: (typeof LANGUAGES)[number], group: string): Item => ({
      key: entry.code,
      code: entry.code.toUpperCase(),
      title: entry.label,
      selected: entry.code === language,
      group,
      ...(entry.ready ? {} : { note: 'non traduite' }),
    })

    /*
     * ── SEULES LES LANGUES COURANTES, comme pour les devises ──────────────────
     *
     * Le groupe « Toutes les langues » offrait une trentaine d'entrées, dont vingt
     * portaient la mention « non traduite » — c'est-à-dire une liste dont les deux
     * tiers annonçaient qu'ils ne servaient pas. Décision de conception : s'en tenir
     * aux dix courantes, qui sont précisément les treize traduites.
     *
     * ⚠️ Même conséquence que pour les devises, et elle vaut d'être sue : les autres
     * langues deviennent INATTEIGNABLES, la recherche comprise, puisqu'elle ne filtre
     * que ce que ce tableau produit. Les fichiers de traduction et le routage par
     * locale restent en place — le rétablissement tient en une entrée de tableau.
     */
    return [
      {
        title: 'Langues courantes',
        items: LANGUAGES.filter((entry) => entry.popular).map((entry) => toItem(entry, 'popular')),
      },
    ]
  }, [tab, available, currency, language, t])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        // On cherche sur le code ET sur le libellé : « JPY » et « yen » doivent
        // l'un comme l'autre trouver la même ligne.
        items: group.items.filter((item) =>
          `${item.code} ${item.title}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, query])

  if (!tab) return null

  const isCurrency = tab === 'currency'
  const onSelect = isCurrency ? setCurrency : setLanguage
  /*
   * ── LA NOTE DE BAS DE PAGE SUIT CE QUI EST RÉELLEMENT PROPOSÉ ─────────────
   *
   * Le test portait sur `LANGUAGES` — le CATALOGUE — et non sur les entrées affichées.
   * Depuis que seules les langues courantes sont proposées, il devenait faux : la note
   * expliquait « choisir une autre langue enregistre votre préférence, mais l'interface
   * reste dans la langue traduite la plus proche » alors qu'aucune langue non traduite
   * n'est plus offerte. Un avertissement sur un cas devenu impossible n'informe pas,
   * il inquiète.
   *
   * Le test porte donc sur `visible`, qui est ce que le lecteur a sous les yeux. La note
   * réapparaîtra d'elle-même le jour où une langue non traduite revient dans la liste.
   */
  const untranslated =
    !isCurrency && visible.some((group) => group.items.some((item) => item.note))

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      {/* Plus large que les 2xl d'origine : la grille de quatre colonnes de la
          référence a besoin de place, et une liste de soixante devises sur deux
          colonnes obligerait à défiler trois fois plus. */}
      <DialogContent className="max-w-4xl gap-0 border-border-subtle bg-overlay p-0 shadow-overlay sm:max-w-4xl">
        {/*
          ── LES ONGLETS SONT CEUX DE RADIX, ET LE `role="tablist"` MANUEL PART ──

          Trois `<button role="tab" aria-selected>` ne font pas un jeu d'onglets : le
          motif ARIA demande aussi `aria-controls`, un `tabpanel` associé, et surtout
          la navigation par FLÈCHES entre les onglets — que trois boutons ordinaires
          n'ont pas, chacun se prenant une tabulation à lui.

          ⚠️ LE PANNEAU EST UNIQUE ET PARTAGÉ. `Tabs` attend normalement un
          `TabsContent` par onglet ; ici les deux affichent la même chose — un champ
          de recherche, une grille, une note — avec des données différentes, déjà
          dérivées de `tab` plus haut. Deux `TabsContent` jumeaux feraient remonter le
          champ de recherche à chaque bascule. On garde donc un seul panneau, rendu
          sous les onglets plutôt qu'à l'intérieur.
        */}
        <Tabs
          value={tab}
          onValueChange={(next) => onTabChange(next as PreferenceTab)}
          className="gap-0"
        >
          <DialogTitle className="sr-only">{isCurrency ? 'Devise' : 'Langue'}</DialogTitle>

          {/* Onglets, et non deux fenêtres séparées : langue et devise sont les deux
              réglages d'affichage que l'on ajuste souvent l'un après l'autre. */}
          <TabsList className="mx-auto mt-6 bg-transparent p-0">
            {(['language', 'currency'] as const).map((entry) => (
              <TabsTrigger
                key={entry}
                value={entry}
                className="rounded-none border-0 border-b-2 border-transparent bg-transparent pb-2 text-base font-semibold text-ink-muted shadow-none data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-ink data-[state=active]:shadow-none"
              >
                {entry === 'language' ? 'Langue' : 'Devise'}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-5 p-6">
          <InputGroup size="default">
            <InputGroupInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Rechercher…')}
              aria-label={isCurrency ? t('Rechercher une devise') : t('Rechercher une langue')}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>

          {visible.length === 0 ? (
            /* `Empty` plutôt qu'un paragraphe centré : il pose l'icône, le titre et
               la phrase dans la même grammaire que les autres vides du site, et il
               annonce le bloc comme une région à la synthèse vocale au lieu de la
               laisser lire une phrase orpheline entre un champ et une note. */
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle className="text-sm">{t('Aucun résultat')}</EmptyTitle>
                <EmptyDescription>
                  {isCurrency
                    ? t('Aucune devise ne correspond à cette recherche.')
                    : t('Aucune langue ne correspond à cette recherche.')}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            /* `ScrollArea` et non `overflow-y-auto` : la barre de défilement native
               s'affiche selon le système — large et permanente sous Windows, absente
               puis surgissante sous macOS — et sa largeur décale la grille de quatre
               colonnes d'un système à l'autre. Celle de Radix est dessinée par le
               site, donc de largeur constante. */
            <ScrollArea className="max-h-[56vh] pr-1">
              <div className="space-y-6">
                {visible.map((group) => (
                  <Group
                    key={group.title}
                    title={group.title}
                    items={group.items}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          <p className="border-t border-border-subtle pt-4 text-xs leading-relaxed text-ink-muted">
            {isCurrency
              ? 'Les montants convertis affichent la devise d’origine et la date du taux appliqué. Les monnaies suivent le taux de référence BCE ; les métaux et les unités crypto, un cours de marché. Une conversion n’est pas un cours coté.'
              : untranslated
                ? translationNotice()
                : 'Votre choix est enregistré sur cet appareil.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Phrase de pied de page sur l'état des traductions.
 *
 * DÉRIVÉE de la liste des langues traduites, jamais écrite en dur. Une phrase figée
 * — « deux langues sont traduites » — devient fausse dès qu'une troisième arrive, et
 * personne ne pense à rouvrir ce fichier ce jour-là. C'est exactement le genre de
 * dérive que le §5 combat : une affirmation vraie à l'écriture, fausse à la lecture.
 */
function translationNotice(): string {
  const ready = LANGUAGES.filter((entry) => entry.ready)
  const names = ready.map((entry) => entry.label)

  const list =
    names.length <= 1
      ? (names[0] ?? 'aucune')
      : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`

  const lead =
    ready.length <= 1
      ? `Seul le ${list.toLowerCase()} est traduit à ce jour.`
      : `${ready.length} langues sont traduites à ce jour : ${list}.`

  return `${lead} Choisir une autre langue enregistre votre préférence, mais l’interface reste dans la langue traduite la plus proche.`
}

/**
 * Un groupe et sa grille.
 *
 * Quatre colonnes sur grand écran comme la référence, deux sur tablette, une sur
 * téléphone. Le code est posé AVANT le libellé et dans une couleur atténuée : il
 * sert de colonne de balayage visuel, alignée d'une ligne à l'autre, ce qu'un
 * libellé de longueur variable ne permet pas.
 */
function Group({
  title,
  items,
  onSelect,
}: {
  title: string
  items: Item[]
  onSelect: (key: string) => void
}) {
  return (
    <section>
      <h3 className="mb-2 border-b border-border-subtle pb-1.5 text-xs font-medium text-ink-muted">
        {title}
      </h3>
      <ul className="grid grid-cols-1 gap-x-2 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              aria-pressed={item.selected}
              // `items-start` et non `items-baseline` : depuis que les libellés
              // passent à la ligne, un alignement sur la ligne de base décalerait le
              // code vers le bas des cellules à deux lignes.
              className={`flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors duration-150 ${
                item.selected ? 'bg-brand-soft' : 'hover:bg-surface-muted'
              }`}
            >
              <span
                className={`w-12 shrink-0 text-[0.6875rem] font-medium uppercase tracking-wide ${
                  item.selected ? 'text-brand-strong' : 'text-ink-muted'
                }`}
              >
                {item.code}
              </span>
              <span className="min-w-0 flex-1">
                {/* Le texte PASSE À LA LIGNE plutôt que d'être tronqué. Les noms de
                    monnaies en français sont longs — « dollar des Émirats arabes
                    unis » — et une troncature les rend indistinguables les uns des
                    autres : « dollar des Émira… » et « dollar des États-… » ne se
                    départagent plus. Deux lignes coûtent de la hauteur ; une
                    troncature coûte la lisibilité. */}
                <span
                  className={`block text-sm leading-snug ${
                    item.selected ? 'font-medium text-brand-strong' : 'text-ink'
                  }`}
                >
                  {item.title}
                </span>
                {item.note ? (
                  <span className="block truncate text-micro text-ink-muted">{item.note}</span>
                ) : null}
              </span>
              {item.selected ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-brand-strong" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
