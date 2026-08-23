'use client'

import { FolderInput, Pencil, Trash2 } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useTransition } from 'react'

import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ExportMenu } from '@/components/tools/ExportMenu'
import { moveToList, removeList, renameList } from '@/lib/watchlist-actions'

export interface BoardItem {
  href: string
  label: string
  symbol: string | null
  assetClass: string
  assetId: string
  addedAt: string
}

export interface BoardList {
  name: string
  items: BoardItem[]
}

/**
 * Tableau de bord de la liste de suivi.
 *
 * ── POURQUOI TOUTES LES LISTES SONT AFFICHÉES, ET NON UNE PAR ONGLET ──────────
 *
 * Une liste de suivi sert à embrasser d'un coup d'œil ce qu'on surveille. Des onglets
 * obligeraient à cliquer pour savoir ce que contient la deuxième — et la raison même
 * de les avoir séparées est de pouvoir les comparer. Elles sont donc empilées, chacune
 * avec son en-tête et ses actions.
 *
 * Le déplacement d'un actif se fait par un `<select>` natif plutôt que par un
 * glisser-déposer. Le glisser-déposer est plus flatteur en démonstration et
 * inutilisable au clavier, au lecteur d'écran et sur mobile ; un sélecteur fait le
 * même travail partout.
 */
export function WatchlistBoard({
  lists,
  canCreateList,
}: {
  lists: BoardList[]
  /** Faux pour l'offre gratuite dès qu'une liste existe : le déplacement en créerait une seconde. */
  canCreateList: boolean
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()

  const names = lists.map((list) => list.name)

  function report(result: { ok: boolean; reason?: string }) {
    if (result.ok) return setMessage(null)

    setMessage(
      result.reason === 'list-limit'
        ? 'Vous avez atteint le nombre maximal de listes.'
        : 'L’opération a échoué. Réessayez.',
    )
  }

  function submitRename(from: string) {
    const target = draft.trim()
    setRenaming(null)
    if (target === '' || target === from) return

    startTransition(async () => report(await renameList(from, target)))
  }

  function drop(name: string) {
    startTransition(async () => report(await removeList(name)))
  }

  function move(item: BoardItem, from: string, to: string) {
    if (to === from) return

    startTransition(async () =>
      report(
        await moveToList({
          assetClass: item.assetClass,
          assetId: item.assetId,
          label: item.label,
          ...(item.symbol ? { symbol: item.symbol } : {}),
          from,
          to,
        }),
      ),
    )
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p
          role="status"
          className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted"
        >
          {message}
        </p>
      ) : null}

      {lists.map((list) => (
        <section key={list.name} className="space-y-3" aria-labelledby={`liste-${list.name}`}>
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
            {renaming === list.name ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submitRename(list.name)
                }}
                className="flex items-center gap-2"
              >
                <Input
                  size="sm"
                  autoFocus
                  value={draft}
                  maxLength={40}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => submitRename(list.name)}
                  aria-label={`Nouveau nom pour ${list.name}`}
                />
                <button type="submit" className="text-xs font-medium text-brand hover:text-brand-strong">
                  Renommer
                </button>
              </form>
            ) : (
              <h2 id={`liste-${list.name}`} className="text-lg font-semibold text-ink">
                {list.name}{' '}
                <span className="tabular text-sm font-normal text-ink-muted">
                  {list.items.length}
                </span>
              </h2>
            )}

            <div className="flex items-center gap-1">
              <ExportMenu
                filename={`zenkuu-${slug(list.name)}`}
                sheetName={list.name}
                rows={list.items}
                columns={[
                  { header: 'Actif', value: (item) => item.label },
                  { header: 'Symbole', value: (item) => item.symbol?.toUpperCase() ?? '' },
                  { header: 'Classe', value: (item) => item.assetClass },
                  { header: 'Identifiant', value: (item) => item.assetId },
                  { header: 'Ajouté le', value: (item) => item.addedAt },
                ]}
              />

              <button
                type="button"
                onClick={() => {
                  setRenaming(list.name)
                  setDraft(list.name)
                }}
                disabled={pending}
                title={`Renommer ${list.name}`}
                aria-label={`Renommer la liste ${list.name}`}
                className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* La suppression n'est proposée qu'à partir de DEUX listes : supprimer
                  la seule qui reste ne « supprime » rien de plus que vider la liste,
                  et le bouton laisserait croire qu'un réglage disparaît avec elle. */}
              {lists.length > 1 ? (
                <button
                  type="button"
                  onClick={() => drop(list.name)}
                  disabled={pending}
                  title={`Supprimer ${list.name} et son contenu`}
                  aria-label={`Supprimer la liste ${list.name} et son contenu`}
                  className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-down disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </header>

          <ul className="space-y-2">
            {list.items.map((item) => (
              <li
                key={`${item.assetClass}:${item.assetId}`}
                className="flex items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface px-4 py-3"
              >
                <Link href={item.href} className="min-w-0 flex-1 text-sm font-medium text-ink hover:text-brand-strong">
                  {item.label}
                  {item.symbol ? (
                    <span className="ml-1.5 text-xs uppercase text-ink-muted">{item.symbol}</span>
                  ) : null}
                </Link>

                {/* Le sélecteur n'apparaît qu'avec une destination possible : proposer
                    de déplacer vers la seule liste existante n'offrirait aucun choix. */}
                {names.length > 1 || canCreateList ? (
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <FolderInput className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {/* `NativeSelect` de shadcn/ui — même contrôle que partout ailleurs.
                        L'intitulé reste NOMINATIF (« Déplacer Bitcoin vers ») et non
                        générique : la page en aligne un par ligne suivie, et un lecteur
                        d'écran qui les parcourt doit savoir lequel il tient. */}
                    <NativeSelect
                      size="sm"
                      className="w-max"
                      aria-label={`Déplacer ${item.label} vers`}
                      value={list.name}
                      disabled={pending}
                      onChange={(event) => move(item, list.name, event.target.value)}
                    >
                      {([
                        ...names.map((name) => ({ label: name, value: name })),
                        ...(canCreateList
                          ? [{ label: 'Nouvelle liste…', value: NEW_LIST }]
                          : []),
                      ]).map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/**
 * Valeur sentinelle du choix « Nouvelle liste… ».
 *
 * Elle traverse `moveToList` comme un nom ordinaire : la liste est créée par le simple
 * fait qu'une ligne y soit écrite (cf. le schéma). Le nom est générique et se renomme
 * ensuite d'un clic — demander le nom AVANT le déplacement imposerait une boîte de
 * dialogue pour une opération qui n'en mérite pas.
 */
const NEW_LIST = 'Nouvelle liste'

/** Nom de fichier sûr — accents retirés, espaces en tirets. */
function slug(value: string): string {
  return value
    .normalize('NFD')
    // Plage de diacritiques écrite en ÉCHAPPEMENTS et non en caractères littéraux :
    // des marques combinantes dans un fichier source sont invisibles à la relecture et
    // survivent mal à un copier-coller.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
