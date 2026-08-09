import { PlaceholderPage, placeholderMetadata } from '@/components/PlaceholderPage'

const TITLE = "Bien démarrer"
const INTRO = "Prendre en main ZENITH en quelques minutes : naviguer entre les classes d’actifs, lire une fiche, suivre ce qui vous intéresse."

const PLANNED = [
        "Parcourir les six classes d’actifs couvertes",
        "Lire une fiche actif : cours, graphique, statistiques",
        "Utiliser la recherche universelle et son raccourci clavier",
        "Constituer une watchlist — à venir avec les comptes utilisateurs",
]

export const metadata = placeholderMetadata(TITLE, INTRO)

export default function Page() {
  return <PlaceholderPage title={TITLE} intro={INTRO} planned={PLANNED} />
}
