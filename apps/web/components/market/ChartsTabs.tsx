import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'
import { CHART_GROUPS, CHART_LINKS } from '@/components/market/charts-nav'
import { getPhrase } from '@/lib/content'

/**
 * Les onglets en tête des graphiques globaux — LE RELAIS DU RAIL SOUS `lg`.
 *
 * ── ILS PORTENT LE GROUPE COURANT, PAS TOUTES LES VUES ──────────────────────
 *
 * Neuf onglets sur une ligne débordent ou se replient derrière un « … », auquel cas
 * on ne voit plus ce que la page contient — ce qu'une rangée d'onglets existe
 * précisément pour montrer. La rangée porte donc les trois vues de « Cryptomonnaies »,
 * celles entre lesquelles on bascule réellement en alternance ; pour une page hors de
 * ce groupe, elle porte les entrées de premier niveau.
 *
 * Le trait actif était une bordure basse posée sur CHAQUE lien, allumée sur l'actif.
 * Des traits dont un seul est visible ne peuvent pas se déplacer : ils clignotent.
 * `LinkTabs` n'en porte qu'un pour toute la rangée, qui parcourt la distance — et le
 * mouvement dit « d'ici vers là » là où deux allumages ne disaient que « plus ici,
 * maintenant là ».
 */
export async function ChartsTabs({ current }: { current: string }) {
  const t = await getPhrase()

  const group = CHART_GROUPS[0]
  const inGroup = group?.entries.some((entry) => entry.href === current) ?? false

  /* ⚠️ L'IDENTIFIANT D'ONGLET EST L'ADRESSE. Elle est unique par construction, là où
     un libellé traduit ne l'est pas nécessairement. */
  const source = inGroup ? (group?.entries ?? []) : CHART_LINKS
  const tabs: LinkTab[] = source.map((entry) => ({
    id: entry.href,
    href: entry.href,
    label: t(entry.label),
  }))

  if (tabs.length === 0) return null

  return (
    <TabsBar variant="pill" ariaLabel={t(inGroup ? (group?.label ?? '') : 'Vues du marché')}>
      <LinkTabs variant="pill" tabs={tabs} active={current} />
    </TabsBar>
  )
}
