import type { Metadata } from 'next'
import { BellRing, CreditCard, Crown, Unlock } from 'lucide-react'

import { Link } from '@/i18n/navigation'

import { PlanGrid } from '@/components/billing/PlanGrid'
import { PricingPlans } from '@/components/billing/PricingPlans'
import { getBillingState } from '@/lib/billing-server'

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'ZENKUU est gratuit et le reste. Zenkuu Pro ajoute les listes de suivi illimitées, 100 alertes de prix par courriel, l’export des tableaux et les filtres avancés du screener.',
  alternates: { canonical: '/tarifs' },
  openGraph: {
    title: 'Tarifs — ZENKUU',
    description:
      'Le site complet, gratuitement. Zenkuu Pro pour ceux qui le consultent tous les jours.',
    url: '/tarifs',
  },
}

/**
 * Page de tarifs.
 *
 * ── POURQUOI UN TABLEAU ÉCRIT EN DUR AU-DESSUS DU COMPOSANT CLERK ─────────────
 *
 * `<PricingTable />` est un îlot client : il n'apparaît qu'après hydratation et
 * n'existe pas dans le HTML servi. Une page de tarifs qui ne contiendrait que lui
 * serait, pour un moteur de recherche, une page vide — alors que le §9 fait du
 * référencement organique le premier moteur d'acquisition, et que « prix » est
 * exactement le type de requête qui amène un lecteur décidé. Le tableau statique
 * porte donc le discours et le référencement ; le composant Clerk porte la
 * transaction. Chacun fait ce que l'autre ne sait pas faire.
 *
 * ── CE QUE LA PAGE PROMET, ET QU'IL FAUT TENIR ────────────────────────────────
 *
 * « Gratuit » y désigne le produit ENTIER, pas une version d'essai amputée. C'est le
 * positionnement du §1 et il vaut engagement : aucune fonction aujourd'hui gratuite ne
 * doit passer derrière l'abonnement. Zenkuu Pro se construit en AJOUTANT, jamais en
 * retirant — le jour où l'on retire, la page ci-dessous devient un mensonge.
 */
export default async function PricingPage() {
  const billing = await getBillingState()

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/*
        EN-TÊTE CENTRÉ, et non aligné à gauche comme le reste du site.

        C'est la seule page où la disposition centrée se justifie, et il faut le dire
        pour qu'elle ne se propage pas : partout ailleurs, le contenu est un TABLEAU DE
        LECTURE qu'on balaie de gauche à droite, et un titre centré y romprait l'axe
        des colonnes. Ici, la page ne porte qu'une comparaison à deux colonnes
        symétriques : le centre est leur axe naturel, et c'est aussi la disposition de
        la référence.
      */}
      <header className="mx-auto mb-8 max-w-2xl space-y-3 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-strong">
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          Zenkuu Pro
        </p>
        <h1 className="display-xl text-ink">Le marché en entier, gratuitement</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Toutes les classes d’actif, toutes les fiches, tous les classements. Zenkuu Pro
          n’en déverrouille aucun — il ajoute le confort de ceux qui consultent tous les
          jours, et finance le reste.
        </p>
      </header>

      {billing.pro ? (
        <p className="mx-auto mb-8 max-w-2xl rounded-card border border-brand bg-brand-soft px-4 py-3 text-center text-sm text-brand-strong">
          Vous êtes abonné à Zenkuu Pro. Merci — c’est ce qui garde le reste du site
          gratuit et sans publicité pour tout le monde.
        </p>
      ) : null}

      {/*
        ── DEUX COLONNES : CE QU'ON OBTIENT, ET CE QUI SE PASSE QUAND ON SOUSCRIT ──

        Structure reprise de la page de référence, et elle résout un vrai défaut :
        le tableau comparatif répond à « qu'est-ce que j'achète » et laisse entière la
        seconde question, celle qui retient réellement la main au-dessus du bouton —
        « et ensuite, il se passe quoi ? ». Elle était traitée trois écrans plus bas,
        noyée dans la foire aux questions.

        `items-start` : les deux colonnes n'ont aucune raison de finir à la même ligne.
      */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <PlanGrid />
        </div>

        <Timeline pro={billing.pro} />
      </div>

      <section className="mt-10 space-y-4" aria-labelledby="souscrire">
        <h2 id="souscrire" className="display-sm text-ink">
          Souscrire
        </h2>
        {/*
          Le paiement, la facture, le changement d'offre et la résiliation sont tous
          rendus par Clerk. On ne réécrit aucun de ces écrans : ce sont ceux où une
          erreur d'implémentation coûte de l'argent réel à quelqu'un.
        */}
        <PricingPlans />

        {billing.available && !billing.signedIn ? (
          <p className="text-sm text-ink-muted">
            Un compte est nécessaire pour souscrire —{' '}
            <Link href="/inscription" className="text-brand hover:text-brand-strong">
              en créer un
            </Link>{' '}
            prend moins d’une minute.
          </p>
        ) : null}
      </section>

      <section className="mt-12 space-y-6" aria-labelledby="questions">
        <h2 id="questions" className="display-sm text-ink">
          Questions fréquentes
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <Faq question="Une fonction gratuite peut-elle devenir payante ?">
            Non. Zenkuu Pro se construit en ajoutant, jamais en retirant. Ce qui est
            gratuit aujourd’hui le restera.
          </Faq>

          <Faq question="Que deviennent mes listes et mes alertes si je me désabonne ?">
            Tout est conservé. Vos listes restent lisibles et exportables ; vous ne
            pourrez simplement plus y ajouter d’actif tant que vous dépassez le plafond
            de l’offre gratuite. Rien n’est supprimé, et vous gardez la main pour faire
            le ménage vous-même.
          </Faq>

          <Faq question="Les alertes sont-elles en temps réel ?">
            Non, et nous ne le prétendons pas : les cours sont relevés toutes les quinze
            minutes. Nos sources sont gratuites et plafonnées à quelques appels par
            minute ; vendre du temps réel serait vendre ce que nous ne pouvons pas
            livrer.
          </Faq>

          <Faq question="Pourquoi moins cher que les autres ?">
            Parce que nous ne revendons pas de données de marché sous licence et ne
            payons pas de flux temps réel. L’abonnement couvre l’hébergement et le
            développement — pas une marge sur de la donnée achetée.
          </Faq>

          <Faq question="Pourquoi les prix sont-ils en dollars ?">
            La devise vient de notre prestataire de paiement, pas d’un choix de notre
            part. Le montant affiché ici est exactement celui qui sera débité ; votre
            banque appliquera sa conversion habituelle si votre compte est en euros.
          </Faq>

          <Faq question="ZENKUU gère-t-il mon argent ?">
            Jamais. Le site est en lecture seule : aucun ordre, aucun portefeuille
            connecté, aucun fonds détenu. L’abonnement est le seul flux financier, et il
            va dans un seul sens.
          </Faq>

          <Faq question="Puis-je résilier quand je veux ?">
            Oui, depuis vos paramètres, en un clic et sans motif. L’abonnement court
            jusqu’à la fin de la période déjà réglée.
          </Faq>
        </div>
      </section>

      <p className="mt-10 border-t border-border-subtle pt-5 text-xs leading-relaxed text-ink-muted">
        ZENKUU publie de l’information de marché. Rien sur ce site, dans l’offre gratuite
        comme dans l’offre Pro, ne constitue un conseil en investissement.
      </p>
    </div>
  )
}

/**
 * Frise « comment ça se passe ».
 *
 * ── CE QU'ELLE RÉPOND, ET QUE LE TABLEAU NE RÉPOND PAS ──────────────────────
 *
 * Le comparatif dit CE QU'ON ACHÈTE. Il laisse entière la question qui retient
 * réellement la main au-dessus du bouton : à partir de quand suis-je engagé, et
 * comment j'en sors. Trois lignes suffisent à y répondre, et les cacher dans une
 * foire aux questions trois écrans plus bas revient à ne pas y répondre.
 *
 * ── ELLE NE PROMET PAS D'ESSAI GRATUIT ─────────────────────────────────
 *
 * La référence rythme la sienne sur ses quatorze jours d'essai (« Aujourd'hui »,
 * « J-11 », « J-14 »). Nous n'en proposons pas : reprendre la forme en inventant la
 * période aurait été la promesse la plus coûteuse de la page. La frise dit donc ce
 * qui se passe vraiment — souscription immédiate, débit, résiliation libre.
 *
 * ── ELLE CHANGE DE TEXTE POUR UN ABONNÉ ───────────────────────────────
 *
 * Expliquer à quelqu'un qui a déjà payé ce qui se passera quand il paiera est le
 * genre de détail qui fait dire « ce site ne me connaît pas ». La dernière étape
 * devient donc son mode d'emploi de sortie.
 */
function Timeline({ pro }: { pro: boolean }) {
  const steps = [
    {
      Icon: Unlock,
      title: 'Tout de suite',
      body: 'Les listes illimitées, les alertes, l’export et les filtres avancés s’ouvrent à la seconde où le paiement passe. Rien à activer.',
    },
    {
      Icon: BellRing,
      title: 'Pendant l’abonnement',
      body: 'Aucune fonction aujourd’hui gratuite ne passera derrière l’offre. Zenkuu Pro se construit en ajoutant, jamais en retirant.',
    },
    pro
      ? {
          Icon: CreditCard,
          title: 'Pour résilier',
          body: 'Depuis vos paramètres, en un clic et sans motif. L’abonnement court jusqu’à la fin de la période déjà réglée, et vos listes restent intactes.',
        }
      : {
          Icon: CreditCard,
          title: 'Quand vous voulez',
          body: 'Résiliation en un clic depuis vos paramètres, sans motif. Vos listes et vos alertes sont conservées — rien n’est supprimé.',
        },
  ]

  return (
    <section
      aria-labelledby="deroulement"
      className="rounded-card border border-border-subtle bg-surface p-5"
    >
      <h2 id="deroulement" className="mb-4 text-sm font-semibold text-ink">
        Comment ça se passe
      </h2>

      <ol className="space-y-5">
        {steps.map((step) => (
          <li key={step.title} className="relative flex gap-3">
            {/* Pastille ronde et non carrée : c'est un jalon sur une frise, une forme
                close — la même famille que les logos et les étiquettes. */}
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand-strong"
              aria-hidden="true"
            >
              <step.Icon className="h-3.5 w-3.5" />
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{step.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                {step.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-ink">{question}</h3>
      <p className="text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  )
}
