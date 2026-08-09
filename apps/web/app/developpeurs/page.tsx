import { PlaceholderPage, placeholderMetadata } from '@/components/PlaceholderPage'

const TITLE = "API & développeurs"
const INTRO = "Accéder par programme aux données agrégées par ZENITH, avec les mêmes garanties de traçabilité que sur le site."

const PLANNED = [
        "Points d’accès REST en lecture seule",
        "Attribution de la source renvoyée avec chaque réponse",
        "Quotas et mise en cache côté client",
        "En attendant, les sources amont sont détaillées dans la page Méthodologie",
]

export const metadata = placeholderMetadata(TITLE, INTRO)

export default function Page() {
  return <PlaceholderPage title={TITLE} intro={INTRO} planned={PLANNED} />
}
