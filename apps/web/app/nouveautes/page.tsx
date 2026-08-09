import { PlaceholderPage, placeholderMetadata } from '@/components/PlaceholderPage'

const TITLE = "Nouveautés"
const INTRO = "Ce qui a changé récemment sur ZENITH : nouvelles classes d’actifs, nouveaux modules, corrections."

const PLANNED = [
        "Journal des versions, du plus récent au plus ancien",
        "Nouvelles sources de données branchées",
        "Modules ouverts et fonctionnalités retirées",
]

export const metadata = placeholderMetadata(TITLE, INTRO)

export default function Page() {
  return <PlaceholderPage title={TITLE} intro={INTRO} planned={PLANNED} />
}
