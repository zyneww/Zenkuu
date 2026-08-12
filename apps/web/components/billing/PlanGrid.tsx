'use client'

import { Check, X } from 'lucide-react'
import { useState } from 'react'

import { PLAN_CARDS, type PlanCard, type PlanPrice } from '@/lib/billing'

/**
 * Grille des offres — la partie éditoriale de la page de tarifs.
 *
 * ── CE QU'ELLE REPREND DE LA RÉFÉRENCE, ET CE QU'ELLE N'EN REPREND PAS ────────
 *
 * De Tokenomist : le titre centré, la bascule de périodicité en pastille, les
 * colonnes d'égale hauteur, le badge posé à cheval sur la colonne mise en avant, les
 * listes à coche et à croix, le bouton plein en travers de la colonne. C'est une
 * grammaire de page de tarifs, largement partagée, et elle fonctionne.
 *
 * PAS le nombre de colonnes. La référence en aligne quatre — gratuit, pro, et deux
 * paliers d'API. Nous en avons DEUX, parce que nous vendons deux choses. Fabriquer
 * deux colonnes d'API pour remplir la grille annoncerait des offres qui n'existent
 * ni dans le produit ni chez le prestataire de paiement : la page ne peut pas
 * promettre ce que le bouton ne peut pas livrer.
 *
 * ── POURQUOI UN COMPOSANT CLIENT ──────────────────────────────────────────────
 *
 * Pour la bascule, et pour elle seule. Elle pourrait passer par l'URL — c'est ce que
 * fait le reste du site pour ses filtres — mais un changement de périodicité n'est ni
 * partageable ni à retrouver dans l'historique du navigateur : ce n'est pas une vue,
 * c'est un coup d'œil. Un état local évite un aller-retour serveur pour changer deux
 * nombres déjà présents dans la page.
 *
 * Le contenu, lui, reste dans le HTML servi : les deux jeux de prix sont rendus par
 * le serveur, la bascule ne fait que choisir lequel s'affiche. La page reste donc
 * indexable sur ses arguments (§9), ce qui était la raison d'être de cette grille
 * face au composant Clerk.
 */

type Period = 'monthly' | 'annual'

export function PlanGrid() {
  const [period, setPeriod] = useState<Period>('annual')

  // La bascule ne s'affiche que si QUELQUE CHOSE bascule. Sur une page où aucune
  // offre n'aurait de tarif annuel, deux boutons dont l'un ne change rien seraient
  // une promesse en l'air.
  const hasAnnual = PLAN_CARDS.some((plan) => plan.annual)

  return (
    <div className="space-y-8">
      {hasAnnual ? (
        <div className="flex justify-center">
          <div
            role="group"
            aria-label="Périodicité de facturation"
            className="inline-flex items-center gap-1 rounded-pill border border-border-subtle bg-surface-muted p-1"
          >
            <PeriodButton
              active={period === 'monthly'}
              onClick={() => setPeriod('monthly')}
              label="Mensuel"
            />
            <PeriodButton
              active={period === 'annual'}
              onClick={() => setPeriod('annual')}
              label="Annuel"
              hint="−38 %"
            />
          </div>
        </div>
      ) : null}

      {/*
        `items-start` et non `items-stretch` : les deux colonnes n'ont pas le même
        nombre de lignes, et les étirer à la même hauteur laisserait un grand vide
        sous la plus courte. La référence les étire ; elle peut se le permettre, ses
        quatre colonnes ayant des listes de longueur comparable.

        `max-w-4xl` centré : à pleine largeur, deux colonnes s'écartent au point
        qu'on ne les compare plus — on lit deux pages côte à côte.
      */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-5 md:grid-cols-2">
        {PLAN_CARDS.map((plan) => (
          <PlanColumn key={plan.slug} plan={plan} period={period} />
        ))}
      </div>
    </div>
  )
}

function PeriodButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
      }`}
    >
      {label}
      {hint ? (
        <span className={`text-xs font-semibold ${active ? 'text-up' : 'text-ink-muted'}`}>
          {hint}
        </span>
      ) : null}
    </button>
  )
}

function PlanColumn({ plan, period }: { plan: PlanCard; period: Period }) {
  /* Repli sur le mensuel : le gratuit n'a pas de tarif annuel, et sa colonne doit
     continuer d'afficher « 0 $ » quand la bascule est sur l'année. */
  const price: PlanPrice = (period === 'annual' ? plan.annual : plan.monthly) ?? plan.monthly

  return (
    <section
      aria-labelledby={`plan-${plan.slug}`}
      /* `pt-8` sur la colonne mise en avant : le badge est posé à cheval sur son bord
         supérieur, et sans cette réserve il recouvrirait le nom de l'offre. */
      className={`relative flex flex-col rounded-card border bg-panel p-6 ${
        plan.highlighted ? 'border-brand pt-8 shadow-overlay' : 'border-border-subtle'
      }`}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-brand px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-on-brand">
          Le plus populaire
        </span>
      ) : null}

      <div className="text-center">
        <h3 id={`plan-${plan.slug}`} className="display-sm text-ink">
          {plan.name}
        </h3>
        <p className="mt-1 text-xs text-ink-muted">{plan.audience}</p>
      </div>

      <div className="mt-5 text-center">
        <p className="flex flex-wrap items-baseline justify-center gap-x-2">
          <span className="tabular text-4xl font-semibold leading-none text-ink">
            {price.amount}
          </span>
          {price.strikethrough ? (
            <s className="tabular text-base text-ink-muted/70">{price.strikethrough}</s>
          ) : null}
          <span className="text-sm text-ink-muted">{price.unit}</span>
        </p>

        {price.savings ? (
          <p className="mt-2">
            <span className="inline-block rounded-pill bg-up-soft px-2.5 py-1 text-xs font-semibold text-up">
              {price.savings}
            </span>
          </p>
        ) : null}

        {/* Ce qui est réellement débité. La ligne existe même quand elle répète le
            montant du dessus : sans elle, un prix « par mois » sur une offre annuelle
            laisse ouverte la question de la cadence de prélèvement — et c'est
            exactement la question qu'on se pose avant de payer. */}
        <p className="mt-2 h-4 text-xs text-ink-muted">{price.billed ?? ''}</p>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-ink-muted">{plan.pitch}</p>

      <ul className="mt-6 space-y-2.5">
        {plan.lines.map((line) => (
          <li key={line} className="flex gap-2.5 text-sm text-ink">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-brand' : 'text-up'}`}
              aria-hidden="true"
            />
            {line}
          </li>
        ))}

        {plan.missing?.map((line) => (
          /* Libellé ET couleur en retrait, pas seulement la croix : c'est ce qui
             permet de balayer la colonne et de voir où elle s'arrête sans lire. */
          <li key={line} className="flex gap-2.5 text-sm text-ink-muted">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted/60" aria-hidden="true" />
            {line}
          </li>
        ))}
      </ul>
    </section>
  )
}
