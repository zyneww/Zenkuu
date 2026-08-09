import { PlaceholderPage, placeholderMetadata } from '@/components/PlaceholderPage'

const TITLE = "Apprendre"
const INTRO = "Comprendre ce que vous regardez : capitalisation, volume, dominance — et ce que ces chiffres disent, ou ne disent pas."

const PLANNED = [
        "Lire une capitalisation et connaître ses limites",
        "Volume et liquidité : pourquoi une forte variation sur faible volume trompe",
        "Offre en circulation, offre totale, offre maximale : trois notions distinctes",
        "Lire un graphique de cours sans y projeter de signaux imaginaires",
]

export const metadata = placeholderMetadata(TITLE, INTRO)

export default function Page() {
  return <PlaceholderPage title={TITLE} intro={INTRO} planned={PLANNED} />
}
