import type { Metadata } from 'next'
import { ChevronDown } from 'lucide-react'
import { Link } from '@/i18n/navigation'

import {
  CACHE_TTL_SECONDS,
  SUPPORTED_CURRENCIES,
  getExchangeRates,
  getMoversUniverse,
  type MarketAsset,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { ConverterView } from '@/components/tools/ConverterView'
import { assetHref } from '@/lib/asset-routes'
import { getPhrase, getSeo } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages traduites. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  const seo = await getSeo()

  return {
    title: t('Convertisseur'),
    description: seo(
      '/convertisseur',
      'Convertir un montant entre une cryptomonnaie, une action, un ETF, un indice ou une matière première et cinq devises, au dernier cours reçu.',
    ),
    alternates: { canonical: '/convertisseur' },
  }
}

/**
 * Convertisseur — CRYPTOMONNAIES SEULEMENT.
 *
 * ── POURQUOI LES QUATRE AUTRES CLASSES SONT PARTIES ───────────────────────────
 *
 * La page couvrait aussi actions, ETF, indices et matières premières. Ce n'était pas
 * une erreur de conception, c'était une extension gratuite : leurs classements étaient
 * déjà en cache. Elle est retirée pour deux raisons qui se renforcent.
 *
 * D'ABORD LE SENS. « Convertir 3 actions Total en dollars » n'est pas une conversion,
 * c'est une valorisation — et le mot « convertisseur » promet la première. Un indice
 * est encore plus douteux : le CAC 40 n'est pas une quantité qu'on détient, multiplier
 * sa valeur par un montant ne produit rien de nommable.
 *
 * ENSUITE LE COÛT. Ces quatre classes coûtaient quatre appels `getRanking` par rendu.
 * Ils étaient certes partagés avec les pages de classement — mais uniquement si
 * quelqu'un les avait ouvertes récemment. Sur un cache froid, chez Yahoo, un classement
 * se construit SYMBOLE PAR SYMBOLE : quatre-vingts requêtes sortantes derrière un
 * limiteur de débit, pour alimenter un menu déroulant dont trois entrées sur quatre
 * n'avaient pas de sens.
 *
 * Reste ce que la page fait bien, et ce que demande la référence (okx.com/fr-fr/convert,
 * qui s'intitule d'ailleurs « convertisseur et calculateur de CRYPTOS ») : un montant,
 * une cryptomonnaie, une devise.
 */
export default async function ConverterPage() {
  const t = await getPhrase()
  const [crypto, rates] = await Promise.all([getMoversUniverse(250, 'eur'), getExchangeRates()])

  const assets: MarketAsset[] = crypto.ok ? crypto.data.filter((asset) => asset.price > 0) : []

  return (
    /* ── UNE COLONNE, ET NON LA LARGEUR DE LA PAGE ────────────────────────────
       La carte de conversion fait 448 px et se centre ; sans borne, elle flottait au
       milieu d'une page de 1 400 pendant que le tableau de cours et la FAQ restaient
       collés au bord gauche. Les trois blocs se lisaient comme trois pages
       superposées. La référence tient dans une colonne étroite : le titre, la carte et
       la FAQ y partagent le même axe. */
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ── L'EN-TÊTE SE RESSERRE ────────────────────────────────────────────

          Il portait un titre en `display-xl` au-dessus d'un paragraphe en `text-lg` :
          près de cent soixante pixels avant le premier champ, sur une page dont tout
          l'objet tient dans une carte de trois cases.

          La référence (CoinGecko) tient sur deux lignes — un titre de la taille d'un
          titre de section, une phrase de la taille du texte courant — et le
          convertisseur commence immédiatement. C'est ce que « reproduire la
          simplicité » veut dire ici : ce n'est pas la carte qui était compliquée,
          c'est ce qu'on empilait autour. */}
      {/*
        ── L'EN-TÊTE DE LA RÉFÉRENCE : UN TITRE, PUIS TROIS MENTIONS ──────────

        Elle pose « Convert » en grand, puis sur une seule ligne trois arguments
        séparés par des barres — « 0 Fees | Locked-In Prices | One-Click Trading » —
        dont le premier est une pastille verte.

        ⚠️ LES NÔTRES DISENT AUTRE CHOSE, ET C'EST OBLIGÉ. « 0 frais » est vrai chez
        eux parce qu'ils exécutent sans commission ; c'est vrai chez nous parce qu'il
        n'y a rien à exécuter. « Prix verrouillé » n'a aucun sens sans exécution — un
        calcul ne verrouille rien. Les trois mentions décrivent donc ce que cette page
        fait réellement : elle ne coûte rien, elle donne le cours du marché, et elle ne
        demande pas de compte.
      */}
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t('Convertisseur')}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
          <span className="rounded-pill bg-up-soft px-2.5 py-0.5 text-xs font-semibold text-up">
            0 frais
          </span>
          <span aria-hidden="true" className="text-border-subtle">
            |
          </span>
          <span>{t('Cours du marché')}</span>
          <span aria-hidden="true" className="text-border-subtle">
            |
          </span>
          <span>{t('Sans compte')}</span>
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          Convertir un montant entre {assets.length} cryptomonnaies et {SUPPORTED_CURRENCIES.length}{' '}
          devises, au dernier cours reçu. Rien ne s’exécute : c’est un calcul, pas une
          offre.
        </p>
      </header>

      {assets.length > 0 ? (
        <>
          <ConverterView
            assets={assets}
            rates={rates.ok ? rates.data : null}
            currencies={SUPPORTED_CURRENCIES}
          />

          <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={crypto.ok ? crypto.source.label : ''}
            href={crypto.ok ? crypto.source.attributionUrl : '#'}
            updatedAt={assets[0]?.lastUpdated}
          />

          {/*
            ── COURS DE RÉFÉRENCE, EN TABLEAU ────────────────────────────────────

            Ce bloc remplace une grille de pastilles « BTC en EUR · 55 139 € » reprise
            telle quelle de la référence. Sa raison d'être ne change pas et reste
            bonne : le convertisseur est un ÎLOT CLIENT, absent du HTML servi, et une
            page d'outil sans contenu servi n'est indexable sur aucune de ses réponses.
            Ces dix lignes portent donc le référencement, et répondent d'un coup d'œil
            à « combien vaut un bitcoin en euros » — la requête qui amène le plus de
            monde ici, et qui ne mérite aucun formulaire.

            Ce qui change est la FORME. Une rangée de pastilles arrondies est leur
            grammaire ; la nôtre est le tableau dense, aligné, à chiffres tabulaires —
            celui de toutes les pages de cotation du site. Une même information dans
            deux grammaires différentes sur le même site coûte plus qu'elle ne rapporte.

            Chaque ligne mène à la FICHE et non à une pré-sélection du convertisseur :
            qui clique a déjà sa réponse, ce qu'il cherche ensuite est le contexte.
          */}
          <section className="max-w-xl space-y-2 border-t border-border-subtle pt-6">
            <h2 className="text-sm font-semibold text-ink">{t('Cours de référence en euros')}</h2>

            <div className="overflow-hidden rounded-card border border-border-subtle">
              <ul className="divide-y divide-border-subtle">
                {assets.slice(0, 10).map((asset) => (
                  <li key={asset.id}>
                    <Link
                      href={assetHref(asset.assetClass, asset.id)}
                      className="group flex items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-surface-muted"
                    >
                      <AssetLogo asset={asset} size={20} />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-brand">
                        {asset.name}
                        <span className="ml-1.5 text-xs uppercase text-ink-muted">
                          {asset.symbol}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm text-ink">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                          maximumFractionDigits: asset.price >= 1 ? 2 : 6,
                        }).format(asset.price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title={t('Cours indisponibles')}
          description={crypto.ok ? null : crypto.reason}
          tone="warning"
        />
      )}

      {/* ── LES DEUX CARTES DE RENVOI DE LA RÉFÉRENCE ──────────────────────────
          Elle place ici « Try Simple Earn » et « Try Fiat Trading », deux produits
          maison. Nous n'en avons aucun à vendre : les deux cartes mènent donc là où va
          naturellement quelqu'un qui vient de convertir — le cours complet de l'actif,
          ou les taux de change officiels. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <RelatedCard
          href="/crypto"
          title={t('Voir les cours')}
          description="Les cryptomonnaies classées par capitalisation, avec leurs variations."
        />
        <RelatedCard
          href="/devises"
          title={t('Taux de référence BCE')}
          description="Les paires de change majeures, telles que la Banque centrale les publie."
        />
      </div>

      <ConverterFaq />
    </div>
  )
}

function RelatedCard({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-card border border-border-subtle bg-surface px-4 py-3 transition-colors hover:border-brand/40 hover:bg-surface-muted"
    >
      <p className="text-sm font-semibold text-ink">
        {title} <span aria-hidden="true">→</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
    </Link>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FAQ — LES QUESTIONS DE LA RÉFÉRENCE, LES RÉPONSES DE CE SITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La référence en pose cinq, numérotées : frais, avantages face au marché au comptant,
 * restrictions, règlement des transactions, ordres à cours limité.
 *
 * ⚠️ QUATRE DES CINQ N'ONT PAS DE RÉPONSE ICI, et pas par paresse : elles décrivent une
 * EXÉCUTION. « Comment les transactions sont-elles réglées » suppose un compte de
 * financement ; « comment fonctionnent les ordres à cours limité » suppose un carnet
 * d'ordres. Traduire leurs réponses donnerait un texte fidèle décrivant un service que
 * ce site ne rend pas — une fausse explication, aussi trompeuse qu'un faux chiffre.
 *
 * Les questions posées ici sont donc celles qu'on se pose DEVANT CETTE PAGE. La
 * première reprend la leur, parce que « y a-t-il des frais » se pose partout ; les
 * autres répondent à ce que la page fait réellement.
 *
 * `<details>` natif, comme les autres FAQ du site : la réponse reste dans le HTML servi
 * même repliée, donc lue par les moteurs sans hydratation.
 */
function ConverterFaq() {
  const entries: { question: string; answer: string[] }[] = [
    {
      question: 'Des frais s’appliquent-ils ?',
      answer: [
        'Aucun. Il n’y a rien à facturer : cette page ne fait qu’un calcul à partir d’un cours publié, sans intermédiaire et sans transaction.',
        'C’est aussi ce qui la distingue d’un prix qu’on vous proposerait : une conversion réelle, chez qui que ce soit, porte des frais, un écart entre l’achat et la vente, et un délai d’exécution. Aucun des trois ne figure ici.',
      ],
    },
    {
      question: 'D’où vient le cours utilisé ?',
      answer: [
        'Du cours agrégé publié par notre source de marché, relevé au plus tard quelques minutes avant l’affichage. L’horodatage exact est écrit sous la carte.',
        'Les cryptomonnaies sont cotées en euros ; toute autre devise applique en plus un taux de la Banque centrale européenne, publié une fois par jour ouvré. Le résultat combine donc deux mesures d’instants différents, ce que la page indique dès que la devise n’est pas l’euro.',
      ],
    },
    {
      question: 'Puis-je convertir réellement depuis cette page ?',
      answer: [
        'Non. ZENKUU n’exécute aucune opération et ne détient aucun fonds — c’est un parti pris, pas une limite technique.',
        'Vous ne trouverez donc nulle part sur ce site un bouton d’achat, de vente, de dépôt ou de retrait. Ce que cette page donne est un ordre de grandeur fiable, pas une offre.',
      ],
    },
    {
      question: 'Que deviennent les calculs que je garde ?',
      answer: [
        'Ils restent dans votre navigateur, dans son stockage local. Rien n’est envoyé à un serveur, et aucun compte n’est nécessaire pour les conserver.',
        'Ils disparaissent si vous effacez les données du site, et ne suivent pas d’un appareil à l’autre.',
      ],
    },
    {
      question: 'Pourquoi certaines devises sont-elles grisées ?',
      answer: [
        'Parce que leur taux n’a pas été publié au dernier relevé. Plutôt que de les retirer — ce qui ferait chercher une devise qu’on sait exister — elles restent visibles et inactives, avec la raison écrite dans la liste.',
        'Une devise sans taux ne peut pas donner un résultat : l’afficher quand même reviendrait à inventer un chiffre.',
      ],
    },
  ]

  return (
    <section className="max-w-3xl space-y-4 border-t border-border-subtle pt-8" aria-labelledby="faq-convertisseur">
      <h2 id="faq-convertisseur" className="display-sm text-ink">
        Questions fréquentes
      </h2>

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <details
            key={entry.question}
            className="group rounded-card border border-border-subtle bg-surface px-4 open:bg-surface-muted"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {index + 1}. {entry.question}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="space-y-2 pb-4">
              {entry.answer.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
