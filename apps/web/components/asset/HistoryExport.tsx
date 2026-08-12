'use client'

import { ExportMenu } from '@/components/billing/ExportMenu'
import { ProGate } from '@/components/billing/ProGate'
import { FEATURES } from '@/lib/billing'

export interface HistoryRow {
  day: string
  price: number
  change: number | null
}

/**
 * Export du tableau d'historique — enveloppe CLIENT.
 *
 * ── POURQUOI CE FICHIER EXISTE PLUTÔT QU'UN APPEL DIRECT DANS LE TABLEAU ──────
 *
 * `PriceHistoryTable` est un composant SERVEUR. Les colonnes d'export sont décrites
 * par des FONCTIONS (`value: (row) => …`), et une fonction ne franchit pas la
 * frontière serveur → client : Next.js refuse de la sérialiser. Les colonnes doivent
 * donc être déclarées du côté client, ce que fait ce fichier — le tableau ne lui passe
 * que des données nues.
 *
 * C'est la même contrainte que celle déjà rencontrée pour les infobulles de graphique
 * (§3.1, « les fonctions ne franchissent pas la frontière serveur/client »), et elle se
 * résout de la même façon : ce qui traverse est de la donnée, jamais du comportement.
 */
export function HistoryExport({
  rows,
  assetName,
  currency,
}: {
  rows: HistoryRow[]
  assetName: string
  currency: string
}) {
  return (
    <ProGate feature={FEATURES.exportData} fallback={null}>
      <ExportMenu
        filename={`zenkuu-historique-${slug(assetName)}`}
        sheetName={assetName.slice(0, 31)}
        rows={rows}
        columns={[
          { header: 'Date', value: (row) => row.day },
          { header: `Clôture (${currency.toUpperCase()})`, value: (row) => row.price },
          // `null` plutôt que 0 sur la ligne la plus ancienne : elle n'a pas de
          // journée précédente, et un zéro se lirait comme « aucune variation ».
          { header: 'Variation (%)', value: (row) => row.change },
        ]}
      />
    </ProGate>
  )
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
