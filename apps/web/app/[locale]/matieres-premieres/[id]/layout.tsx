import { AssetShell } from '@/components/asset/AssetShell'

/**
 * Le bandeau persistant de la fiche — voir `AssetShell` pour le raisonnement complet.
 *
 * ⚠️ CE FICHIER EST LA MOITIÉ DU CORRECTIF, ET C'EST SON EMPLACEMENT QUI COMPTE.
 * Next.js ne re-rend pas une mise en page quand on navigue entre ses enfants : posé
 * ici, le bandeau enveloppe l'aperçu, les métriques, l'historique et le halving, et
 * reste le même nœud du DOM tout du long. Le rendre depuis chaque page — ce que
 * faisaient les quatre — le remontait à neuf à chaque bascule.
 */
export default async function AssetLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AssetShell assetClass="commodity" id={id}>
      {children}
    </AssetShell>
  )
}
