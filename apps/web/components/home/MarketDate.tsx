import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LIGNE DE DATE — CE QUE LA PAGE COUVRE, ET DE QUAND ELLE DATE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE REMPLACE ─────────────────────────────────────────────────────
 *
 * `MarketMasthead`, qui portait la même date mais alignée à GAUCHE, flanquée à droite
 * de deux compteurs de couverture (« Actifs suivis », « Capitalisation suivie ») et
 * suivie d'un rail de cinq raccourcis. Les trois éléments sont retirés, et il faut
 * dire pourquoi chacun l'est :
 *
 *   · les COMPTEURS répondaient à une question que personne ne pose en arrivant.
 *     « Combien d'actifs le site suit-il » est un argument de vente, pas une donnée
 *     de marché — et posé à hauteur de la date, il pesait autant qu'elle ;
 *   · le RAIL doublait la navigation de l'en-tête, entrée pour entrée ;
 *   · la disposition GAUCHE-DROITE faisait de la ligne une barre d'outils. Centrée
 *     et seule, elle redevient ce qu'elle est : le titre de l'instantané.
 *
 * ── L'HEURE N'EST PAS UN ORNEMENT ───────────────────────────────────────────
 *
 * Elle dit de quand datent les chiffres qui suivent, et c'est vérifiable : la page
 * est régénérée toutes les trois minutes (`revalidate` dans `page.tsx`), et cette
 * heure est celle de la génération. Elle ne peut donc pas mentir de plus que le TTL,
 * là où une heure posée côté client dirait l'heure du LECTEUR — c'est-à-dire rien sur
 * la fraîcheur de la donnée.
 *
 * `timeZone: 'UTC'` fige le rendu des deux valeurs. Sans lui, la date changerait selon
 * le fuseau du serveur qui a mis la page en cache, et deux visiteurs pourraient lire
 * deux jours différents à une minute d'intervalle. Le fuseau est donc ÉCRIT : « UTC »
 * n'est pas une décoration, c'est ce qui dit lequel des deux jours c'est.
 */
export async function MarketDate({ locale }: { locale: string }) {
  const t = await getPhrase()
  const now = new Date()

  const day = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const time = now.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })

  return (
    <section aria-label={t('Date de couverture')} className="flex flex-col items-center gap-1 text-center">
      {/* `first-letter:uppercase` : `toLocaleDateString` rend « samedi 22 août » en
          minuscule dans les langues qui ne capitalisent pas les jours. Le forcer dans
          le CSS plutôt que dans le JavaScript laisse chaque langue décider — une
          majuscule imposée en JavaScript serait fausse en turc, dont le « i » majuscule
          n'est pas « I ». */}
      <h2 className="text-xl font-semibold text-ink first-letter:uppercase">{day}</h2>

      <p className="text-xs text-ink-muted">
        {t('Données à jour à {time} UTC').replace('{time}', time)}
      </p>
    </section>
  )
}
