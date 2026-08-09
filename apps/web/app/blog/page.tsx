import { PlaceholderPage, placeholderMetadata } from '@/components/PlaceholderPage'

const TITLE = "Blog"
const INTRO = "Analyses de marché et coulisses du produit. Les billets publiés ici resteront distincts des données : une analyse n’est pas une recommandation."

const PLANNED = [
        "Notes d’analyse sur les mouvements marquants",
        "Coulisses techniques : sources de données et arbitrages",
        "Journal des évolutions du produit",
]

export const metadata = placeholderMetadata(TITLE, INTRO)

export default function Page() {
  return <PlaceholderPage title={TITLE} intro={INTRO} planned={PLANNED} />
}
