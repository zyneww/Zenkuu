'use client'

import { Check, Download } from 'lucide-react'
import { useState } from 'react'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  EXPORT_FORMATS,
  serialize,
  type ExportColumn,
  type ExportFormat,
} from '@/lib/export-formats'

/**
 * Menu d'export d'un tableau.
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
 *
 * ── L'OUVERTURE ET LA FERMETURE NE SONT PLUS ÉCRITES ICI ──────────────────────
 *
 * `DropdownMenu` de shadcn/ui — c'est-à-dire celui de Radix — apporte le clic
 * extérieur, la touche Échap, le retour du focus sur le déclencheur à la fermeture,
 * les flèches haut/bas, Origine/Fin et la frappe au vol : quarante lignes de
 * gestionnaires d'événements en moins, et un comportement clavier qu'on n'avait pas.
 *
 * ⚠️ `asChild` SUR LE DÉCLENCHEUR, sans quoi Radix rendrait son propre `<button>`
 * autour du nôtre. Deux boutons imbriqués sont un HTML invalide : le navigateur les
 * remonte en frères, la mise en page casse, et aucune erreur n'est levée pour le dire.
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
  const t = usePhrase()
  const [copied, setCopied] = useState(false)

  async function run(format: ExportFormat, extension: string) {
    const payload = serialize(format, columns, rows, sheetName)

    if (typeof payload === 'string') {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      // Le retour visuel s'efface seul : une coche permanente ne dirait plus si la
      // copie date de maintenant ou d'il y a cinq minutes.
      window.setTimeout(() => setCopied(false), 2000)
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={rows.length === 0}>
          {copied ? <Check /> : <Download />}
          {copied ? t('Copié') : t('Exporter')}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* Le décompte est un `DropdownMenuLabel` et non un paragraphe libre : Radix
            le sort de l'ordre de tabulation et le marque comme intitulé du groupe, ce
            qui le fait annoncer AVANT les formats plutôt qu'entre deux d'entre eux. */}
        <DropdownMenuLabel className="text-[0.6875rem] font-normal text-ink-muted">
          {t(rows.length > 1 ? '{n} lignes à exporter' : '{n} ligne à exporter').replace(
            '{n}',
            String(rows.length),
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {EXPORT_FORMATS.map((format) => (
          <DropdownMenuItem
            key={format.id}
            onSelect={() => {
              void run(format.id, format.extension)
            }}
            className="flex-col items-start gap-0.5"
          >
            <span className="font-medium">{format.label}</span>
            <span className="text-[0.6875rem] text-ink-muted">{format.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
