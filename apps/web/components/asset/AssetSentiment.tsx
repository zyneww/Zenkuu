import { Meter } from '@heroui/react'

import type { AssetDetail } from '@zenkuu/data'
import { formatShare } from '@zenkuu/ui'

import { RailSection } from '@/components/ui/RailSection'
import { getPhrase } from '@/lib/content'

/**
 * Vote communautaire haussier / baissier.
 *
 * ── CE PANNEAU PORTE SON PROPRE AVERTISSEMENT, ET CE N'EST PAS NÉGOCIABLE ─────
 *
 * Toutes les autres cartes de la fiche montrent des mesures de marché : un volume
 * est un volume, une capitalisation est une capitalisation. Celle-ci montre un
 * SONDAGE — ce que pensent les gens qui ont cliqué sur un bouton chez la source.
 * La population qui vote n'a aucune raison d'être celle qui détient, et rien ne
 * garantit qu'un vote corresponde à une position réelle.
 *
 * Posé sans mention au milieu de chiffres sourcés, ce pourcentage se lirait comme
 * eux. La ligne d'explication n'est donc pas une politesse : elle est la condition
 * pour que ce chiffre puisse être affiché du tout (§5). Si elle gêne un jour la mise
 * en page, c'est le panneau qui part, pas la mention.
 *
 * ── LA BARRE EST À DEUX SEGMENTS, PAS À UN ────────────────────────────────────
 *
 * Une jauge simple remplie à 31 % se lit « faible ». Or il n'y a pas de « faible »
 * ici : 31 % de haussiers, c'est 69 % de baissiers, et les deux camps existent
 * également. Deux segments accolés disent une RÉPARTITION ; une jauge dirait un
 * niveau, ce qui serait un contresens.
 */
export async function AssetSentiment({ asset }: { asset: AssetDetail }) {
  const t = await getPhrase()
  const up = asset.sentimentUpPercent
  if (up === undefined) return null

  // Bornage : la source publie parfois 100 ou 0 tout rond, et une valeur hors [0,100]
  // produirait une barre qui déborde de sa piste.
  const upShare = Math.min(Math.max(up, 0), 100)
  const downShare = 100 - upShare

  return (
    <RailSection title={t('Sentiment')}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="tabular font-semibold text-up">{formatShare(upShare)}</span>
        <span className="tabular font-semibold text-down">{formatShare(downShare)}</span>
      </div>

      {/*
        ══════════════════════════════════════════════════════════════════════
        LA BARRE EST UN `Meter`, PLUS UN `role="img"`
        ══════════════════════════════════════════════════════════════════════

        Elle était deux `<div>` de largeurs complémentaires dans une enveloppe annoncée
        comme une IMAGE. Le libellé était juste — « 66 % de votes haussiers, 34 % de
        votes baissiers » — mais le rôle mentait sur la nature de la chose : une synthèse
        vocale annonçait « image » et lisait un texte, là où il s'agit d'une VALEUR SUR
        UNE ÉCHELLE. Un lecteur braille ne pouvait pas la rendre comme une jauge, et
        aucune technologie d'assistance ne pouvait proposer « quelle est la valeur ? ».

        `Meter` de HeroUI rend `role="meter"` avec `aria-valuenow`, `aria-valuemin` et
        `aria-valuemax`. C'est le rôle exact : une mesure dans un intervalle CONNU, par
        opposition à `progressbar` qui décrit une tâche qui avance. La distinction
        compte — un sentiment de marché ne « progresse » pas vers 100 %.

        ── LE FOND PORTE LA PART BAISSIÈRE, ET C'EST VOULU ─────────────────────

        La piste n'est pas neutre : elle est peinte en rouge de baisse, et le
        remplissage vert la recouvre à hauteur de la part haussière. Les deux camps
        occupent donc toujours ensemble la largeur entière, sans qu'aucun `<div>` de
        complément ne soit nécessaire.

        ⚠️ LES DEUX COULEURS SONT POSÉES EN CLASSES, PAS PAR `--color-accent`.

        Un premier essai passait par une propriété personnalisée en style en ligne
        (`--color-accent: var(--color-up)`) pour surcharger la menthe que `globals.css`
        donne aux racines HeroUI. Elle n'a jamais pris : `Meter` ne transmet pas
        l'attribut `style` à son nœud racine — constaté au navigateur, le remplissage
        restait en `rgb(94,234,212)`.

        `bg-up` sur le remplissage et `bg-down` sur la piste sont de toute façon plus
        directs : ici la couleur n'est pas un accent de marque mais une DONNÉE — le vert
        est le camp haussier, le rouge le camp baissier. La dire par le jeton qui la
        nomme est plus honnête que de détourner le jeton d'accent.
      */}
      <Meter
        value={upShare}
        aria-label={`${Math.round(upShare)} % de votes haussiers, ${Math.round(downShare)} % de votes baissiers`}
        className="mt-2 block"
      >
        <Meter.Track className="h-1.5 overflow-hidden rounded-pill bg-down">
          <Meter.Fill className="h-full bg-up" />
        </Meter.Track>
      </Meter>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-[0.6875rem] text-ink-muted">
        <span>{t('Haussier')}</span>
        <span>{t('Baissier')}</span>
      </div>

      <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
        {t('Vote des visiteurs de la source, et non une mesure de marché : rien ne garantit qu’un vote corresponde à une position détenue.')}
      </p>
    </RailSection>
  )
}
