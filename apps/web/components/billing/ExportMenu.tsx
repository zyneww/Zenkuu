'use client'

import { Check, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import {
  EXPORT_FORMATS,
  serialize,
  type ExportColumn,
  type ExportFormat,
} from '@/lib/export-formats'

/**
 * Menu d'export d'un tableau — fonction Zenkuu Pro.
 *
 * ── POURQUOI CÔTÉ NAVIGATEUR, ET NON PAR UNE ROUTE SERVEUR ────────────────────
 *
 * Les lignes exportées sont EXACTEMENT celles déjà affichées, donc déjà présentes
 * dans la page. Les redemander au serveur coûterait un appel de plus à une source
 * dont le §9 rappelle qu'elle tolère quelques requêtes par minute, pour produire un
 * fichier que le navigateur assemble seul et instantanément. En prime, ce qui est
 * exporté est alors garanti identique à ce qui est lu — un export serveur rejouerait
 * les filtres et pourrait diverger.
 *
 * Corollaire à assumer : ce menu n'est pas une frontière de sécurité, et il n'a pas à
 * l'être puisqu'il ne donne accès à rien que le lecteur n'ait déjà reçu. Ce qui se
 * vend ici est la mise en forme, pas la donnée. Toute fonction future qui livrerait
 * une donnée SUPPLÉMENTAIRE devra passer par `hasFeature()`, côté serveur.
 */
export function ExportMenu<T>({
  filename,
  columns,
  rows,
  sheetName,
}: {
  /** Sans extension — la date du jour et l'extension sont ajoutées. */
  filename: string
  columns: ExportColumn<T>[]
  rows: T[]
  /** Nom de l'onglet du classeur Excel. */
  sheetName?: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  /* Le curseur qui s'éloigne referme le menu, au même titre que le clic extérieur et
     la touche Échap ci-dessous. Voir components/nav/useHoverDismiss.ts. */
  const hoverDismiss = useHoverDismiss(() => setOpen(false), open)

  // Fermeture au clic extérieur et à Échap. Les deux, et pas l'un des deux : un menu
  // qui ne se ferme qu'à la souris piège la navigation au clavier.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function run(format: ExportFormat, extension: string) {
    const payload = serialize(format, columns, rows, sheetName)

    if (typeof payload === 'string') {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      // Le retour visuel s'efface seul : une coche permanente ne dirait plus si la
      // copie date de maintenant ou d'il y a cinq minutes.
      window.setTimeout(() => setCopied(false), 2000)
      setOpen(false)
      return
    }

    const url = URL.createObjectURL(payload)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.${extension}`
    anchor.click()

    // Sans révocation, l'URL d'objet retient le contenu du fichier en mémoire jusqu'au
    // déchargement de la page — sur un outil dont on se sert plusieurs fois de suite,
    // cela s'accumule.
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const disabled = rows.length === 0

  return (
    <div ref={container} className="relative" {...hoverDismiss}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink disabled:opacity-50"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-up" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? 'Copié' : 'Exporter'}
      </button>

      {open ? (
        <div
          role="menu"
          // `overlay` et non `surface` : le menu survole réellement la page, et avec
          // `canvas` égal à `surface` il s'y confondrait (cf. §3.1).
          className="absolute right-0 z-30 mt-1 w-64 rounded-card border border-border-subtle bg-overlay p-1 shadow-overlay"
        >
          <p className="px-3 py-2 text-[0.6875rem] uppercase tracking-wide text-ink-muted">
            {rows.length} ligne{rows.length > 1 ? 's' : ''} à exporter
          </p>

          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              role="menuitem"
              onClick={() => void run(format.id, format.extension)}
              className="block w-full rounded-sm px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-muted"
            >
              <span className="block text-sm font-medium text-ink">{format.label}</span>
              <span className="block text-xs text-ink-muted">{format.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
