'use client'

import { useId } from 'react'
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * JAUGE DE SENTIMENT — LE RADIAL DE shadcn/ui, ET PLUS UNE AIGUILLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE REMPLACE ────────────────────────────────────────────────────
 *
 * Un demi-arc en SVG, tracé par un `<path>` à commande `A`, surmonté d'une AIGUILLE
 * calculée en trigonométrie (`Math.cos` / `Math.sin` sur un angle dérivé de la
 * valeur) et d'un moyeu. Trente lignes de géométrie pour dire « 66 sur 100 ».
 *
 * ── POURQUOI L'AIGUILLE DISPARAÎT, ET CE N'EST PAS UNE PERTE ───────────────
 *
 * Une aiguille pointe UNE position sur une échelle ; un arc rempli montre en plus la
 * COURSE parcourue depuis zéro. Sur une mesure bornée à 0–100 — ce qu'est l'indice
 * Fear & Greed — la seconde lecture est la bonne : « les deux tiers du chemin vers
 * l'avidité » se voit d'un coup d'œil, là où une aiguille demande de comparer sa
 * direction à des graduations que la jauge ne portait même pas.
 *
 * ── LE DÉGRADÉ RESTE, ET CHANGE DE RÔLE ────────────────────────────────────
 *
 * Il habillait l'arc unique — peur à gauche, avidité à droite — ce qui était sa seule
 * façon de dire l'échelle. Il habille désormais la PISTE DE FOND, c'est-à-dire
 * exactement l'échelle, pendant que la barre porte la valeur dans la teinte de sa
 * zone. Les deux informations cessent de se disputer le même trait.
 *
 * ── POURQUOI CE FICHIER EXISTE SÉPARÉMENT ──────────────────────────────────
 *
 * `SidePanels` est un composant SERVEUR : il lit les données, les met en forme et
 * n'envoie pas une ligne de JavaScript. `recharts` est client. Cette jauge est donc
 * le plus petit îlot client possible — elle reçoit un nombre et un libellé, rien de
 * plus, et le reste du panneau reste rendu sur le serveur.
 */
export function SentimentGauge({
  value,
  /** Libellé de la zone — « Avidité », « Peur extrême »… Annoncé, jamais dessiné. */
  label,
  /**
   * Teinte de la zone, décidée par l'appelant qui connaît les seuils.
   *
   * ⚠️ C'EST UN JETON CSS, PAS UNE CLASSE UTILITAIRE. La première version prenait une
   * classe (`text-up`) et peignait la barre en `currentColor`. Ça ne marchait pas :
   * `RadialBar` ne transmet pas `className` à son secteur — il arrivait littéralement
   * à `"undefined"` dans le DOM — et `currentColor` héritait alors d'une couleur au
   * hasard. Le défaut était invisible en lecture du code, et visible à l'écran.
   */
  toneColor,
}: {
  value: number
  label: string
  toneColor: string
}) {
  const gradientId = useId().replace(/:/g, '')

  return (
    <ChartContainer
      config={{}}
      role="img"
      aria-label={`${value} sur 100, ${label}`}
      /*
       * `aspect-auto` : un demi-disque occupe deux fois plus de large que de haut, et
       * le 16/9 par défaut de `ChartContainer` ne lui convient pas. La taille est
       * imposée en pixels — la jauge vit dans une colonne latérale étroite, où une
       * figure élastique se retrouverait plus large que sa carte.
       *
       * La piste de fond est peinte par un STYLE EN LIGNE, et il faut savoir pourquoi :
       * `ChartContainer` pose `fill-muted` sur `.recharts-radial-bar-background-sector`
       * — c'est dans le composant du registre shadcn, pas dans notre code. Une règle CSS
       * l'emporte sur un attribut de présentation, si bien que le dégradé passé en
       * `fill` sortait en gris uni et que l'échelle rouge → verte disparaissait. Le style
       * en ligne, lui, passe devant la règle.
       */
      className="aspect-auto"
      style={{ width: 176, height: 96 }}
    >
      <RadialBarChart
        data={[{ value }]}
        /* Demi-cercle orienté de la peur (gauche) à l'avidité (droite). */
        startAngle={180}
        endAngle={0}
        innerRadius={62}
        outerRadius={86}
        /* `cy="100%"` cale le centre du disque sur le bas de la boîte : sans cela,
           `recharts` centre le demi-cercle verticalement et réserve en pure perte la
           moitié basse, invisible. */
        cy="100%"
        barSize={8}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-down)" />
            <stop offset="50%" stopColor="var(--color-brand)" />
            <stop offset="100%" stopColor="var(--color-up)" />
          </linearGradient>
        </defs>

        {/* SANS CET AXE, LA BARRE OCCUPERAIT TOUJOURS TOUT L'ARC. `recharts` cale par
            défaut le domaine sur le maximum des données — avec un seul point, la
            valeur EST le maximum, et la jauge afficherait 100 % quoi qu'il arrive. Le
            domaine explicite 0–100 est ce qui la rend juste. */}
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />

        <RadialBar
          dataKey="value"
          angleAxisId={0}
          cornerRadius={4}
          fill={toneColor}
          background={{ style: { fill: `url(#${gradientId})`, opacity: 0.4 } }}
          isAnimationActive={false}
        />
      </RadialBarChart>
    </ChartContainer>
  )
}
