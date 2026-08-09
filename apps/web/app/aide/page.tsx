import { PlaceholderPage, placeholderMetadata } from '@/components/PlaceholderPage'

const TITLE = "Centre d’aide"
const INTRO = "Questions fréquentes sur les données, leur fraîcheur et les limites de ce que ZENITH affiche."

const PLANNED = [
        "Pourquoi certains chiffres apparaissent comme indisponibles",
        "À quelle fréquence chaque donnée est actualisée",
        "Pourquoi ZENITH ne permet ni achat ni vente",
        "Signaler une donnée qui vous semble erronée",
]

export const metadata = placeholderMetadata(TITLE, INTRO)

export default function Page() {
  return <PlaceholderPage title={TITLE} intro={INTRO} planned={PLANNED} />
}
