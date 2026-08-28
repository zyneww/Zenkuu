'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrency } from '@/components/locale/CurrencyProvider'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Devises proposées au bord droit d'une rangée de tableau, comme sur la référence.
 *
 * QUATRE ET NON SOIXANTE-DEUX : le catalogue complet vit dans la fenêtre de
 * préférences, qui sait le grouper et le chercher. Ici, ce qu'on veut est une bascule
 * — dollar, euro, et les deux unités crypto dans lesquelles le marché se cote
 * réellement. Une liste de soixante-deux lignes au-dessus d'un tableau n'est pas une
 * bascule, c'est un formulaire.
 */
const BOARD_CURRENCIES = ['USD', 'EUR', 'BTC', 'ETH'] as const

/**
 * Bascule de devise.
 *
 * ── ELLE PILOTE LA PRÉFÉRENCE DU SITE, PAS UN ÉTAT LOCAL ───────────────────
 *
 * `useCurrency` est déjà partagé par tout le site et mémorisé dans le navigateur :
 * changer de devise ici change aussi les fiches d'actif, les palmarès et le
 * convertisseur. C'est le comportement attendu — une devise choisie sur un tableau
 * et oubliée à la page suivante serait un piège — et cela évite d'ajouter un second
 * état qui divergerait du premier.
 *
 * ⚠️ LES CODES SONT FILTRÉS PAR `available`. Cette liste est dérivée des TAUX REÇUS :
 * si la source de change est en panne pour le bitcoin, la ligne disparaît au lieu
 * d'afficher des montants inchangés sans le signaler (§5). Le sélecteur ne se rend
 * pas du tout s'il ne reste qu'un choix — un contrôle sans effet fait douter de ceux
 * qui en ont un.
 *
 * ── POURQUOI CE FICHIER PLUTÔT QUE `BoardTabs` ─────────────────────────────
 *
 * Il y vivait, et `/categories` a fini par vouloir le même sélecteur. L'importer
 * depuis `BoardTabs` aurait fait entrer les six cents lignes du tableau de bord —
 * filtres, onglets, colonnes — dans le paquet d'une page qui n'en affiche rien.
 */
export function BoardCurrency() {
  const t = usePhrase()
  const { currency, setCurrency, available } = useCurrency()

  const offered = BOARD_CURRENCIES.filter((code) => available.includes(code))

  /* La devise courante peut venir des préférences et sortir des quatre proposées :
     on l'ajoute alors en tête plutôt que d'afficher un déclencheur vide. */
  const choices = offered.includes(currency as (typeof BOARD_CURRENCIES)[number])
    ? offered
    : [currency, ...offered]

  if (choices.length < 2) return null

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger size="sm" aria-label={t('Devise d’affichage')} className="tabular w-max font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {choices.map((code) => (
          <SelectItem key={code} value={code} className="tabular">
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
