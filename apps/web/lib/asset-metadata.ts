import type { Metadata } from 'next'

import type { AssetClass } from '@zenith/data'
import { getAsset } from '@zenith/data'

import { fr } from '@/content/fr'

/**
 * Métadonnées d'une page d'actif.
 *
 * Le titre porte le nom réel : « Zenith | Bitcoin (BTC) » se reconnaît dans une
 * barre d'onglets encombrée, là où « Zenith | Cryptomonnaies » serait identique pour
 * les milliers de fiches — et sans valeur pour le référencement, qui est le premier
 * moteur d'acquisition du site (§9).
 *
 * Factorisé ici plutôt que dupliqué dans les six routes : ces fichiers ne doivent
 * contenir que du câblage, pour qu'une correction ne s'applique qu'à un seul endroit.
 */
export async function buildAssetMetadata(
  assetClass: AssetClass,
  id: string,
): Promise<Metadata> {
  const asset = await getAsset(id, assetClass, 'eur')

  if (!asset.ok) {
    // Actif inconnu ou source en panne : pas de titre inventé, et surtout pas
    // d'indexation d'une page qui n'a rien à montrer.
    return { title: fr.asset.notFoundTitle, robots: { index: false } }
  }

  const { name, symbol, description } = asset.data
  const title = `${name} (${symbol})`

  return {
    title,
    description: description
      ? description.slice(0, 155)
      : `Cours, capitalisation et statistiques de ${name} sur ${fr.site.name}.`,
    openGraph: {
      title: `${fr.site.name} | ${title}`,
      description: `Cours et statistiques de ${name} — plateforme d’analyse en lecture seule.`,
    },
  }
}
