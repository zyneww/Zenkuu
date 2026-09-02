import { ASSET_CLASSES, SUPPORTED_CURRENCIES, YAHOO_UNIVERSE } from '@zenkuu/data'

import { HELP_ARTICLES } from '@/content/aide'
import { getPhrase } from '@/lib/content'

/**
 * Bandeau de chiffres clés.
 *
 * Reprise structurelle d'une page « à propos » d'entreprise : un bandeau de repères
 * chiffrés entre la mission et le reste du récit.
 *
 * ÉCART DÉLIBÉRÉ ET IMPORTANT. Les références du secteur affichent ici des
 * métriques d'audience — millions d'utilisateurs, volumes échangés, pays couverts.
 * ZENKUU n'a ni audience publiée ni volume à afficher, et inventer ces nombres
 * serait exactement ce que le §5 interdit : des chiffres invérifiables présentés
 * comme des faits.
 *
 * Les valeurs ci-dessous sont donc CALCULÉES à partir du code lui-même. Elles
 * décrivent le produit et non l'entreprise, elles sont vérifiables par quiconque lit
 * le dépôt, et elles se mettent à jour toutes seules quand le périmètre change —
 * une valeur écrite en dur deviendrait fausse au premier actif ajouté.
 */

/** `nft` est déclaré dans le domaine mais aucune source ne l'alimente : on ne le compte pas. */
const LIVE_CLASSES = ASSET_CLASSES.filter((assetClass) => assetClass !== 'nft').length

const YAHOO_TRACKED = Object.values(YAHOO_UNIVERSE).reduce(
  (total, entries) => total + entries.length,
  0,
)

const FIGURES: { value: string; label: string; detail: string }[] = [
  {
    value: String(LIVE_CLASSES),
    label: 'classes d’actifs',
    detail: 'Crypto, devises, actions, ETF, matières premières et indices, sous une même grille de lecture.',
  },
  {
    value: '5',
    label: 'sources publiques',
    detail: 'CoinGecko, la Banque centrale européenne, Yahoo Finance, Alternative.me et des flux RSS d’éditeurs.',
  },
  {
    value: `${YAHOO_TRACKED}+`,
    label: 'actifs cotés suivis',
    detail: 'Univers actions, ETF, indices et matières premières, auquel s’ajoute l’ensemble du marché crypto.',
  },
  {
    value: String(SUPPORTED_CURRENCIES.length),
    label: 'devises d’affichage',
    detail: 'Conversion au taux de référence quotidien de la BCE, avec la date du taux appliqué.',
  },
  {
    value: '5 min',
    label: 'fraîcheur des cours',
    detail: 'Durée de cache la plus courte. Certains agrégats sont rafraîchis toutes les 30 minutes.',
  },
  {
    /* ⚠️ LES FICHES PÉDAGOGIQUES NE COMPTENT PLUS : `/apprendre` a été supprimé, et
       ce chiffre annonçait la somme des articles d'aide ET des fiches. Le laisser
       aurait affiché un total dont la moitié ne mène plus nulle part — exactement le
       genre de nombre qu'un lecteur vérifie en cliquant. */
    value: String(HELP_ARTICLES.length),
    label: 'articles publiés',
    detail: 'Fiches pédagogiques et articles d’aide rédigés pour ZENKUU, sans contenu généré de remplissage.',
  },
]

export async function KeyFigures() {
  const t = await getPhrase()
  return (
    <section className="space-y-3" aria-labelledby="chiffres-cles">
      <h2 id="chiffres-cles" className="text-lg font-semibold text-ink">
        {t('ZENKUU en quelques chiffres')}
      </h2>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIGURES.map((figure) => (
          <div
            key={t(figure.label)}
            className="rounded-card border border-border-subtle bg-surface p-4"
          >
            <dt className="text-2xl font-bold text-ink">
              {figure.value}{' '}
              <span className="text-sm font-medium text-ink">{t(figure.label)}</span>
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-muted">{t(figure.detail)}</dd>
          </div>
        ))}
      </dl>

      <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
        {t(
          'Ces chiffres décrivent le produit, pas une audience. Vous ne trouverez ici ni nombre d’utilisateurs ni volume échangé : ZENKUU n’exécute aucune transaction, et publier des métriques invérifiables contredirait la règle qui interdit d’afficher une donnée qu’on ne peut pas sourcer.',
        )}
      </p>
    </section>
  )
}
