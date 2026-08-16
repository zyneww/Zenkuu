/**
 * Sérialisation d'un tableau vers cinq formats.
 *
 * ── POURQUOI AUCUNE BIBLIOTHÈQUE ──────────────────────────────────────────────
 *
 * Le réflexe pour produire un `.xlsx` est d'installer SheetJS. Il pèse plusieurs
 * centaines de kilo-octets, embarque des lecteurs de formats dont nous n'avons aucun
 * usage — on n'IMPORTE jamais de fichier ici, on n'en écrit que — et la version
 * distribuée sur npm a traîné des vulnérabilités connues. Pour ce qu'on lui demande
 * (une feuille, une ligne d'en-tête, des nombres typés), le format se réduit à six
 * fichiers XML dans une archive ZIP non compressée : c'est ce que fait `toXlsx`, en
 * une centaine de lignes qu'on peut relire.
 *
 * ── POURQUOI CINQ FORMATS ─────────────────────────────────────────────────────
 *
 * Chacun répond à un usage distinct, et aucun n'est un doublon décoratif :
 *
 * · CSV          — l'échange universel, ouvrable partout
 * · Excel (xlsx) — les nombres restent des NOMBRES : triables, sommables, sans
 *                  l'étape « convertir le texte en colonnes » que le CSV impose
 * · JSON         — le format d'un script ou d'un carnet de notes d'analyse
 * · Markdown     — se colle tel quel dans une note, un ticket, un article
 * · Presse-papiers (TSV) — se colle DIRECTEMENT dans Google Sheets ou Excel, sans
 *                  passer par un fichier ni par un assistant d'importation
 */

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'markdown' | 'clipboard'

export interface ExportFormatSpec {
  id: ExportFormat
  label: string
  hint: string
  extension: string
}

export const EXPORT_FORMATS: ExportFormatSpec[] = [
  { id: 'csv', label: 'CSV', hint: 'Universel, ouvrable partout', extension: 'csv' },
  { id: 'xlsx', label: 'Excel', hint: 'Nombres typés, triables et sommables', extension: 'xlsx' },
  { id: 'json', label: 'JSON', hint: 'Pour un script ou une analyse', extension: 'json' },
  { id: 'markdown', label: 'Markdown', hint: 'À coller dans une note', extension: 'md' },
  {
    id: 'clipboard',
    label: 'Copier',
    hint: 'À coller dans Google Sheets ou Excel',
    extension: 'tsv',
  },
]

/* ── CSV ─────────────────────────────────────────────────────────────────────── */

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""'
  return `"${String(value).replace(/"/g, '""')}"`
}

/**
 * CSV à séparateur POINT-VIRGULE, préfixé d'un BOM UTF-8.
 *
 * Les deux détails décident si le fichier s'ouvre correctement en France :
 *
 * · Excel choisit son séparateur d'après la locale du système. En français c'est le
 *   point-virgule, la virgule étant lue comme séparateur décimal — un fichier à
 *   virgules arrive donc dans une colonne unique.
 * · Sans BOM, Excel lit le fichier dans son encodage local et « Société Générale »
 *   devient « SociÃ©tÃ© GÃ©nÃ©rale ». Les autres tableurs ignorent le BOM : il ne
 *   coûte rien là où il ne sert pas.
 */
export function toCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const lines = [
    columns.map((column) => escapeCsv(column.header)).join(';'),
    ...rows.map((row) => columns.map((column) => escapeCsv(column.value(row))).join(';')),
  ]
  return `﻿${lines.join('\r\n')}`
}

/* ── TSV (presse-papiers) ────────────────────────────────────────────────────── */

/**
 * Tabulations, sans guillemets ni BOM.
 *
 * C'est le format que Google Sheets et Excel reconnaissent au COLLAGE : chaque
 * tabulation ouvre une cellule, chaque saut de ligne une ligne. Les guillemets du CSV
 * seraient ici recopiés littéralement dans les cellules. Toute tabulation ou tout
 * saut de ligne présent dans une valeur est donc remplacé par une espace — sans quoi
 * une seule valeur casserait l'alignement de toute la grille.
 */
export function toTsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const clean = (value: string | number | null | undefined) =>
    value === null || value === undefined ? '' : String(value).replace(/[\t\r\n]+/g, ' ')

  return [
    columns.map((column) => clean(column.header)).join('\t'),
    ...rows.map((row) => columns.map((column) => clean(column.value(row))).join('\t')),
  ].join('\n')
}

/* ── JSON ────────────────────────────────────────────────────────────────────── */

/**
 * Tableau d'objets, clés = en-têtes de colonne.
 *
 * Les valeurs gardent leur TYPE : un prix reste un nombre JSON, pas une chaîne. C'est
 * tout l'intérêt du format par rapport au CSV, et cela impose de ne pas passer les
 * valeurs par une mise en forme d'affichage en amont.
 */
export function toJson<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const records = rows.map((row) => {
    const record: Record<string, string | number | null> = {}
    for (const column of columns) {
      const value = column.value(row)
      record[column.header] = value === undefined ? null : value
    }
    return record
  })

  return JSON.stringify(records, null, 2)
}

/* ── Markdown ────────────────────────────────────────────────────────────────── */

/**
 * Tableau GitHub-flavored.
 *
 * Les barres verticales contenues dans une valeur sont échappées : une seule barre
 * non échappée ouvre une colonne fantôme et décale toute la ligne à l'affichage.
 */
export function toMarkdown<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const cell = (value: string | number | null | undefined) =>
    value === null || value === undefined ? '' : String(value).replace(/\|/g, '\\|')

  const head = `| ${columns.map((column) => cell(column.header)).join(' | ')} |`
  const rule = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${columns.map((column) => cell(column.value(row))).join(' | ')} |`)

  return [head, rule, ...body].join('\n')
}

/* ── XLSX ────────────────────────────────────────────────────────────────────── */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Référence de cellule au format A1 — au-delà de Z, les colonnes deviennent AA, AB… */
function cellRef(columnIndex: number, rowIndex: number): string {
  let name = ''
  let n = columnIndex
  do {
    name = String.fromCharCode(65 + (n % 26)) + name
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return `${name}${rowIndex}`
}

function sheetXml<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const header = columns
    .map(
      (column, index) =>
        // `s="1"` renvoie au style gras défini dans styles.xml ; `t="inlineStr"` évite
        // la table de chaînes partagées, qui n'économise rien sur un export ponctuel
        // et ajouterait un septième fichier à l'archive.
        `<c r="${cellRef(index, 1)}" s="1" t="inlineStr"><is><t>${escapeXml(column.header)}</t></is></c>`,
    )
    .join('')

  const body = rows
    .map((row, rowIndex) => {
      const cells = columns
        .map((column, columnIndex) => {
          const value = column.value(row)
          const ref = cellRef(columnIndex, rowIndex + 2)

          if (value === null || value === undefined || value === '') return ''

          // Un nombre est écrit SANS `t` : c'est ce qui le rend triable et sommable
          // dans Excel. Le tester plutôt que le convertir évite de transformer en
          // nombre un symbole comme « 1INCH », qui doit rester du texte.
          if (typeof value === 'number' && Number.isFinite(value)) {
            return `<c r="${ref}"><v>${value}</v></c>`
          }

          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`
        })
        .join('')

      return `<row r="${rowIndex + 2}">${cells}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData><row r="1">${header}</row>${body}</sheetData></worksheet>`
}

/* ── Archive ZIP minimale (méthode « stockée », sans compression) ─────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let value = i
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[i] = value >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  bytes: Uint8Array
  crc: number
  offset: number
}

/**
 * Écrit une archive ZIP « stockée » — aucune compression.
 *
 * Le format ZIP autorise la méthode 0 (données recopiées telles quelles), et tous les
 * lecteurs la comprennent. C'est ce qui permet de se passer d'une implémentation de
 * DEFLATE : un export de screener pèse quelques dizaines de kilo-octets, la
 * compression y gagnerait un fichier plus petit au prix de trois cents lignes de code
 * supplémentaires à maintenir et à déboguer.
 *
 * La date des entrées est FIGÉE au 1er janvier 1980 (l'origine du format). Deux
 * exports du même tableau produisent ainsi des octets identiques — pratique pour
 * comparer, et sans conséquence puisque le nom du fichier, lui, porte la date du jour.
 */
function writeZip(entries: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  let offset = 0

  const push = (bytes: Uint8Array) => {
    chunks.push(bytes)
    offset += bytes.length
  }

  const header = (size: number) => {
    const view = new DataView(new ArrayBuffer(size))
    return { view, bytes: new Uint8Array(view.buffer) }
  }

  const written: ZipEntry[] = []

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const bytes = encoder.encode(entry.content)
    const crc = crc32(bytes)
    const start = offset

    const { view, bytes: local } = header(30)
    view.setUint32(0, 0x04034b50, true) // signature d'en-tête local
    view.setUint16(4, 20, true) // version minimale requise
    view.setUint16(6, 0, true) // indicateurs
    view.setUint16(8, 0, true) // méthode 0 = stockée
    view.setUint16(10, 0, true) // heure (figée)
    view.setUint16(12, 33, true) // date (1980-01-01)
    view.setUint32(14, crc, true)
    view.setUint32(18, bytes.length, true) // taille compressée = taille brute
    view.setUint32(22, bytes.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true) // champ « extra »

    push(local)
    push(nameBytes)
    push(bytes)

    written.push({ name: entry.name, bytes, crc, offset: start })
  }

  const directoryStart = offset

  for (const entry of written) {
    const nameBytes = encoder.encode(entry.name)
    const { view, bytes: central } = header(46)
    view.setUint32(0, 0x02014b50, true) // signature d'entrée de catalogue
    view.setUint16(4, 20, true) // version d'écriture
    view.setUint16(6, 20, true) // version minimale requise
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint16(14, 33, true)
    view.setUint32(16, entry.crc, true)
    view.setUint32(20, entry.bytes.length, true)
    view.setUint32(24, entry.bytes.length, true)
    view.setUint16(28, nameBytes.length, true)
    view.setUint16(30, 0, true)
    view.setUint16(32, 0, true) // commentaire
    view.setUint16(34, 0, true) // disque de départ
    view.setUint16(36, 0, true) // attributs internes
    view.setUint32(38, 0, true) // attributs externes
    view.setUint32(42, entry.offset, true)

    push(central)
    push(nameBytes)
  }

  const { view, bytes: end } = header(22)
  view.setUint32(0, 0x06054b50, true) // fin de catalogue
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, written.length, true)
  view.setUint16(10, written.length, true)
  view.setUint32(12, offset - directoryStart, true)
  view.setUint32(16, directoryStart, true)
  view.setUint16(20, 0, true)
  push(end)

  return new Blob(chunks as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** Classeur Excel à une feuille, en-tête gras et figé. */
export function toXlsx<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  sheetName = 'ZENKUU',
): Blob {
  return writeZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      // Le nom d'onglet est borné à 31 caractères : au-delà, Excel refuse d'ouvrir
      // le fichier — sans indiquer pourquoi.
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      // Deux styles seulement : l'ordinaire (index 0) et le gras (index 1), auquel
      // renvoie le `s="1"` des cellules d'en-tête.
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml(columns, rows) },
  ])
}

/* ── Point d'entrée ──────────────────────────────────────────────────────────── */

/**
 * Produit le contenu d'un format donné.
 *
 * Le presse-papiers renvoie une CHAÎNE et non un `Blob` : il n'y a pas de fichier à
 * écrire, seulement du texte à poser. C'est l'appelant qui distingue les deux cas —
 * les fusionner derrière un type unique obligerait à reconvertir des octets en texte
 * juste après les avoir produits.
 */
export function serialize<T>(
  format: ExportFormat,
  columns: ExportColumn<T>[],
  rows: T[],
  sheetName?: string,
): Blob | string {
  switch (format) {
    case 'csv':
      return new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' })
    case 'xlsx':
      return toXlsx(columns, rows, sheetName)
    case 'json':
      return new Blob([toJson(columns, rows)], { type: 'application/json;charset=utf-8;' })
    case 'markdown':
      return new Blob([toMarkdown(columns, rows)], { type: 'text/markdown;charset=utf-8;' })
    case 'clipboard':
      return toTsv(columns, rows)
  }
}
