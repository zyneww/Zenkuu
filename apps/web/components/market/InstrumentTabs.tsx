import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'
import { getPhrase } from '@/lib/content'

/**
 * Navigation entre les trois pages d'INSTRUMENTS ET DE PLACES.
 *
 * ── CE QU'ELLE REMPLACE ─────────────────────────────────────────────────────
 *
 * `BrowseTabs` posait ici une barre de dix onglets : les sept classes d'actifs, plus
 * les dérivés, les places de cotation et les places de dérivés. Elle est partie avec
 * `/marches`, la page qu'elle servait — et les sept classes sont parties avec elle,
 * vers le menu « Parcourir » de l'en-tête et leurs six routes dédiées.
 *
 * Restent ces trois-là, et elles forment un groupe qui se tient : aucune ne liste des
 * actifs qu'on détient. `/derives` liste des CONTRATS, `/places` et `/perpetuels` des
 * PLATEFORMES. Passer de l'une à l'autre est un geste réel — « où ça se traite » est
 * la question qui suit « quoi » — là où passer de « Actions » à « Perpétuels » n'en
 * était pas un.
 *
 * Trois onglets et non dix : la barre redevient lisible d'un coup d'œil, ce qu'une
 * rangée de dix cibles ne permettait plus.
 */
export async function InstrumentTabs({ current }: { current: 'derives' | 'places' | 'perpetuels' }) {
  const t = await getPhrase()

  const tabs: LinkTab[] = [
    { id: 'derives', href: '/derives', label: t('Dérivés') },
    { id: 'places', href: '/places', label: t('Places de cotation') },
    { id: 'perpetuels', href: '/perpetuels', label: t('Places de dérivés') },
  ]

  return (
    <TabsBar ariaLabel="Instruments et places">
      <LinkTabs tabs={tabs} active={current} />
    </TabsBar>
  )
}
