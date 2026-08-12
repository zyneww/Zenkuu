/**
 * Disposition des pages d'intégration.
 *
 * Elle remplace celle du site pour les routes `/embed/*` : ni barre de navigation,
 * ni pied de page, ni conteneur centré à 1280 px. Une iframe de 56 pixels de haut
 * n'a que faire d'un menu, et le conteneur du layout racine ajouterait des marges
 * qui décaleraient le widget dans le cadre de l'hôte.
 *
 * Le fond reste transparent, volontairement : le widget s'insère ainsi dans la
 * couleur de la page hôte au lieu d'y poser un rectangle opaque.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-transparent">{children}</div>
}
