'use client'

import {
  Breadcrumb as UiBreadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useAssetTabs } from '@/components/asset/asset-tabs'
import { useContent, usePhrase } from '@/components/locale/ContentProvider'
import { Link } from '@/i18n/navigation'
import { assetHref, marketHref } from '@/lib/asset-routes'
import type { AssetClass } from '@zenkuu/data'

/**
 * Le fil d'Ariane d'une fiche d'actif.
 *
 * ⚠️ EXTRAIT DE `AssetPageView`, PARCE QU'IL A CHANGÉ DE PROPRIÉTAIRE. Il y vivait en
 * fonction locale du temps où la fiche était la seule page à en porter un. Les onglets
 * ont depuis donné à l'actif quatre pages, et le fil appartient désormais au BANDEAU
 * PERSISTANT qui les surmonte toutes — voir `AssetShell`.
 *
 * ⚠️ ET IL EST PASSÉ CÔTÉ CLIENT, ce que sa version serveur n'était pas. Il doit
 * connaître l'onglet courant pour fermer son dernier maillon, et cet onglet se lit dans
 * `useSelectedLayoutSegment()` — voir `asset-tabs.ts`, qui dit aussi pourquoi le
 * maillon est nécessaire plutôt que décoratif. `usePhrase` et `useContent` lisent
 * exactement les mêmes tables que leurs équivalents serveur.
 *
 * ── CE QUE `Breadcrumb` DE SHADCN/UI APPORTE À TROIS `<li>` ─────────────────
 *
 * La structure était déjà correcte — un `<nav aria-label>`, une `<ol>`, un
 * `aria-current="page"` sur le dernier maillon. Ce que la version maison n'avait pas,
 * et qui se remarque à l'oreille plus qu'à l'œil :
 *
 *   · LE SÉPARATEUR N'EST PLUS UN CARACTÈRE. C'était un `<li aria-hidden>/</li>` :
 *     une barre oblique dans le flux du texte, que certaines synthèses vocales lisent
 *     malgré `aria-hidden` lorsqu'elles parcourent caractère par caractère.
 *     `BreadcrumbSeparator` rend un chevron SVG, marqué `presentation`.
 *   · LE DERNIER MAILLON EST UN `BreadcrumbPage`, c'est-à-dire un `<span
 *     role="link" aria-disabled>` : il est annoncé comme un lien COURANT et non
 *     comme du texte ordinaire, ce qui situe la page dans la hiérarchie.
 *
 * ⚠️ `asChild` SUR CHAQUE MAILLON. `BreadcrumbLink` rend un `<a>` en dur ; le site
 * sert treize langues et ses chemins sont préfixés par la locale, que seul le `Link`
 * de next-intl pose. Sans `asChild`, chaque maillon renverrait le lecteur anglophone
 * vers la version française de la page.
 */
export function AssetBreadcrumb({
  assetClass,
  id,
  name,
}: {
  assetClass: AssetClass
  id: string
  name: string
}) {
  const t = usePhrase()
  const fr = useContent()
  const { active } = useAssetTabs(assetClass, id)

  /* L'aperçu n'a pas de segment, donc pas de maillon : le fil s'arrête au nom de
     l'actif, qui EST la page courante. C'est aussi la forme de la référence. */
  const tab = active?.segment === null ? undefined : active?.label

  return (
    <UiBreadcrumb aria-label={t('Fil d’Ariane')} className="text-xs text-ink-muted">
      <BreadcrumbList className="gap-1.5 text-xs sm:gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="hover:text-brand">
            <Link href="/">{fr.nav.home}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="hover:text-brand">
            <Link href={marketHref(assetClass)}>{fr.assetClass[assetClass]}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {tab === undefined ? (
            <BreadcrumbPage className="font-medium text-ink">{name}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild className="hover:text-brand">
              <Link href={assetHref(assetClass, id)}>{name}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {tab === undefined ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-ink">{tab}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </UiBreadcrumb>
  )
}
